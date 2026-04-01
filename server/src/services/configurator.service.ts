import { prisma } from '../db.js';
import { AppError } from '../middleware/errorHandler.js';
import {
  ConfiguratorRequest,
  ConfiguratorResponse,
  Placement,
  ResolvedTransferSize,
  TransferSizeCode,
} from '../types/index.js';

const VALID_LOGO_PLACEMENTS: Record<string, string[]> = {
  FRONT: ['LC', 'IBR'],
  BACK: ['LF', 'IBR'],
};

export class ConfiguratorService {
  private buildConfigurationCode(baseCode: string, logoPlacementCode: string) {
    return `${baseCode}_${logoPlacementCode}`;
  }

  private async getPrintArea(garmentModelId: string, printPlacementCode: string) {
    return prisma.printArea.findFirst({
      where: {
        garmentModelId,
        active: true,
        placement: { code: printPlacementCode, kind: 'print', active: true },
      },
      include: { placement: true },
    });
  }

  async resolveConfiguration(config: ConfiguratorRequest): Promise<ConfiguratorResponse> {
    const {
      customizationMode,
      garmentModelId,
      sizeId,
      colorId,
      printPlacementCode,
      logoPlacementCode,
      designId,
      uploadTemplateId,
      transferSizeCode,
    } = config;

    const model = await prisma.garmentModel.findUnique({
      where: { id: garmentModelId },
    });

    if (!model || !model.active) {
      throw new AppError('Garment model not found', 404);
    }

    const blankStock = await prisma.blankStock.findUnique({
      where: {
        garmentModelId_colorId_sizeId: {
          garmentModelId,
          colorId,
          sizeId,
        },
      },
    });

    if (!blankStock) {
      throw new AppError('Blank stock not found', 404);
    }

    const printArea = await this.getPrintArea(garmentModelId, printPlacementCode);
    if (!printArea) {
      throw new AppError('Print area not configured for this garment and placement', 400);
    }

    const allowedLogoCodes = VALID_LOGO_PLACEMENTS[printPlacementCode] || [];
    if (allowedLogoCodes.length === 0) {
      throw new AppError('Invalid print placement', 400);
    }

    const allowedLogoPlacements = await prisma.placement.findMany({
      where: {
        active: true,
        kind: 'logo',
        code: { in: allowedLogoCodes },
      },
      orderBy: { code: 'asc' },
    }) as Placement[];

    if (!logoPlacementCode) {
      throw new AppError('Logo placement is required', 400);
    }

    const selectedLogoPlacement = allowedLogoPlacements.find((placement) => placement.code === logoPlacementCode);
    if (!selectedLogoPlacement) {
      throw new AppError('Logo placement is not valid for the selected print placement', 400);
    }

    let extraPrice = 0;
    let transferStock: number | null = null;
    let availableTransferSizes: ResolvedTransferSize[] = [];
    let selectedTransferSize: ResolvedTransferSize | undefined;
    let baseCode = '';

    if (customizationMode === 'brand_design') {
      if (!designId) {
        throw new AppError('Design is required for brand design mode', 400);
      }

      const design = await prisma.design.findUnique({
        where: { id: designId },
        include: {
          collection: true,
          transferSizes: { where: { active: true } },
          placements: { include: { placement: true } },
        },
      });

      if (!design || !design.active) {
        throw new AppError('Design not found', 404);
      }

      if (design.collection) {
        const now = new Date();
        if (!design.collection.active) {
          throw new AppError('Design collection is inactive', 400);
        }
        if (design.collection.startsAt && design.collection.startsAt > now) {
          throw new AppError('Design collection is not active yet', 400);
        }
        if (design.collection.endsAt && design.collection.endsAt < now) {
          throw new AppError('Design collection is no longer available', 400);
        }
      }

      const allowedPrintPlacements = design.placements.map((item) => item.placement.code);
      if (allowedPrintPlacements.length > 0 && !allowedPrintPlacements.includes(printPlacementCode)) {
        throw new AppError('Design is not available for the selected print placement', 400);
      }

      availableTransferSizes = design.transferSizes.map((sizeOption) => ({
        code: sizeOption.sizeCode as TransferSizeCode,
        widthCm: sizeOption.widthCm,
        heightCm: sizeOption.heightCm,
        extraPrice: sizeOption.extraPrice,
        stock: sizeOption.stock,
      }));

      const transferSize = availableTransferSizes.find((item) => item.code === transferSizeCode);
      if (!transferSize) {
        throw new AppError('Transfer size is not available for this design', 400);
      }

      transferStock = transferSize.stock;
      extraPrice = transferSize.extraPrice;
      selectedTransferSize = transferSize;
      baseCode = design.code;
    } else {
      if (!uploadTemplateId) {
        throw new AppError('Upload template is required for user upload mode', 400);
      }

      const template = await prisma.uploadTemplate.findUnique({
        where: { id: uploadTemplateId },
        include: {
          placement: true,
          sizeOptions: { where: { active: true } },
        },
      });

      if (!template || !template.active) {
        throw new AppError('Upload template not found', 404);
      }

      if (template.placement.code !== printPlacementCode) {
        throw new AppError('Upload template is not valid for the selected print placement', 400);
      }

      availableTransferSizes = template.sizeOptions.map((sizeOption) => ({
        code: sizeOption.sizeCode as TransferSizeCode,
        widthCm: sizeOption.widthCm,
        heightCm: sizeOption.heightCm,
        extraPrice: sizeOption.extraPrice,
        stock: null,
      }));

      const templateSize = availableTransferSizes.find((item) => item.code === transferSizeCode);
      if (!templateSize) {
        throw new AppError('Transfer size is not available for this upload template', 400);
      }

      extraPrice = templateSize.extraPrice;
      selectedTransferSize = templateSize;
      baseCode = template.code;
    }

    const basePrice = model.basePrice || 0;
    const totalPrice = basePrice + extraPrice;

    return {
      valid: blankStock.quantity > 0 && (transferStock === null || transferStock > 0),
      basePrice,
      extraPrice,
      price: totalPrice,
      allowedLogoPlacements,
      selectedLogoPlacement,
      selectedPrintPlacement: printArea.placement as Placement,
      availableTransferSizes,
      selectedTransferSize,
      printArea,
      stock: {
        blank: blankStock.quantity,
        transfer: transferStock,
      },
      configurationCode: this.buildConfigurationCode(baseCode, logoPlacementCode),
    };
  }
}

export const configuratorService = new ConfiguratorService();

import { configuratorService } from '../services/configurator.service.js';
import { parseConfiguratorRequest } from '../validation/request-validation.js';

export async function resolveConfigurationHandler(body: unknown) {
  const config = parseConfiguratorRequest(body);
  return configuratorService.resolveConfiguration(config);
}

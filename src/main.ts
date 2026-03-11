import './style.css';

// ----------------------------------------------------
// PRODUCT & SPA STATE
// ----------------------------------------------------
const products = [
  {
    id: 'oversize',
    title: 'REMERA OVERSIZE',
    price: '$ 25.000',
    desc: 'Remera de corte amplio y relajado, ideal para un estilo urbano. Hecha con algodón premium de alto gramaje para máxima durabilidad y confort.'
  },
  {
    id: 'musculosa',
    title: 'MUSCULOSA',
    price: '$ 18.000',
    desc: 'Clásica musculosa de verano con ajuste regular. Tejido ligero y respirable ideal para los días más calurosos.'
  },
  {
    id: 'crop',
    title: 'TOP CROP',
    price: '$ 15.000',
    desc: 'Diseño moderno de corte por encima de la cintura. Combina perfectamente con prendas de tiro alto para un look actual.'
  }
];

let currentProductIndex = 0;
let selectedSize: string | null = null;
let currentProductId = 'oversize';

// SPA DOM Elements
const screenCategory = document.getElementById('screenCategory') as HTMLElement;
const screenProduct = document.getElementById('screenProduct') as HTMLElement;
const screenCustomizer = document.getElementById('screenCustomizer') as HTMLElement;

const btnCatIndumentaria = document.getElementById('btnCatIndumentaria') as HTMLButtonElement;
const btnBackToCat = document.getElementById('btnBackToCat') as HTMLButtonElement;
const btnContinueCustomizer = document.getElementById('btnContinueCustomizer') as HTMLButtonElement;
const btnBackToProduct = document.getElementById('btnBackToProduct') as HTMLButtonElement;

// Product Card DOM
const carouselContainer = document.getElementById('productCarousel') as HTMLDivElement;
const btnCarouselPrev = document.getElementById('btnCarouselPrev') as HTMLButtonElement;
const btnCarouselNext = document.getElementById('btnCarouselNext') as HTMLButtonElement;
const prodTitle = document.getElementById('prodTitle') as HTMLHeadingElement;
const prodDesc = document.getElementById('prodDesc') as HTMLParagraphElement;
const sizeChips = document.querySelectorAll('.size-chip');
const customizerModelLabel = document.getElementById('customizerModelLabel') as HTMLParagraphElement;

// Nav Logic
function switchScreen(hideEl: HTMLElement, showEl: HTMLElement) {
  hideEl.classList.remove('active-screen');
  hideEl.classList.add('hide');

  showEl.classList.remove('hide');
  // slight delay for transition
  setTimeout(() => showEl.classList.add('active-screen'), 50);
}

btnCatIndumentaria.addEventListener('click', () => {
  switchScreen(screenCategory, screenProduct);
});

btnBackToCat.addEventListener('click', () => {
  switchScreen(screenProduct, screenCategory);
});

btnBackToProduct.addEventListener('click', () => {
  switchScreen(screenCustomizer, screenProduct);
});

btnContinueCustomizer.addEventListener('click', () => {
  // Update Customizer state
  const product = products[currentProductIndex];
  currentProductId = product.id;
  customizerModelLabel.textContent = `${product.title} - Talle ${selectedSize}`;

  // Force base image update in customizer
  updateImageSource();

  switchScreen(screenProduct, screenCustomizer);
});

// // Removed IntersectionObserver in favor of direct click calculation
// function updateProductCard(index: number) {
//   });
// }, observerOptions);

function updateProductCard(index: number) {
  if (currentProductIndex === index) return;
  currentProductIndex = index;
  const p = products[index];

  prodTitle.textContent = p.title;
  prodDesc.textContent = p.desc;
}

// Nav Arrows Logic
function scrollCarousel(dir: 1 | -1) {
  const slideWidth = carouselContainer.clientWidth;

  // Predict next index
  let nextIndex = currentProductIndex + dir;
  if (nextIndex < 0) nextIndex = 0;
  if (nextIndex >= products.length) nextIndex = products.length - 1;

  // Scroll visually
  carouselContainer.scrollBy({ left: slideWidth * dir, behavior: 'smooth' });

  // Force update text immediately
  updateProductCard(nextIndex);
}

btnCarouselNext.addEventListener('click', () => scrollCarousel(1));
btnCarouselPrev.addEventListener('click', () => scrollCarousel(-1));

// Size Chips Selection
sizeChips.forEach(chip => {
  chip.addEventListener('click', () => {
    // Remove active from all
    sizeChips.forEach(c => c.classList.remove('active'));
    // Add active to clicked
    chip.classList.add('active');

    selectedSize = chip.textContent;
    btnContinueCustomizer.disabled = false;
  });
});


// ----------------------------------------------------
// CUSTOMIZER LOGIC (EXISTING)
// ----------------------------------------------------
type ViewType = 'front' | 'back';
type ShirtColor = 'white' | 'black';

interface LogoState {
  src: string;
  x: number;
  y: number;
  width: number;
}

const state = {
  color: 'white' as ShirtColor,
  view: 'front' as ViewType,
  logos: {
    front: null as LogoState | null,
    back: null as LogoState | null,
  }
};

const colorBtns = document.querySelectorAll('.color-orb');
const btnFront = document.getElementById('btnFront') as HTMLButtonElement;
const btnBack = document.getElementById('btnBack') as HTMLButtonElement;
const fileInput = document.getElementById('fileInput') as HTMLInputElement;
const uploadZone = document.getElementById('uploadZone') as HTMLDivElement;
const btnRemoveLogo = document.getElementById('btnRemoveLogo') as HTMLButtonElement;

const tshirtBase = document.getElementById('tshirtBase') as HTMLImageElement;
const printAreaFront = document.getElementById('printAreaFront') as HTMLDivElement;
const printAreaBack = document.getElementById('printAreaBack') as HTMLDivElement;

let currentPrintArea = printAreaFront;

function updateImageSource() {
  const colorStr = state.color;
  const viewStr = state.view;

  // Construct dynamic src based on selected product, color, and view.
  if (currentProductId === 'oversize') {
    tshirtBase.src = `/tshirt-${colorStr}-${viewStr}.png`;
  } else {
    tshirtBase.src = `/model-${currentProductId}-${colorStr}-${viewStr}.png`;
  }

  // Ensure the black CSS filter hack is removed so the green container background isn't darkened
  tshirtBase.style.filter = 'none';
}

function updateColor(color: ShirtColor) {
  state.color = color;
  updateImageSource();
  colorBtns.forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-color') === color);
  });
}

function updateView(view: ViewType) {
  state.view = view;
  updateImageSource();

  if (view === 'front') {
    printAreaFront.classList.remove('hidden');
    printAreaBack.classList.add('hidden');
    currentPrintArea = printAreaFront;
    btnFront.classList.add('active');
    btnBack.classList.remove('active');
  } else {
    printAreaFront.classList.add('hidden');
    printAreaBack.classList.remove('hidden');
    currentPrintArea = printAreaBack;
    btnFront.classList.remove('active');
    btnBack.classList.add('active');
  }

  renderLogo();
  checkLogoState();
}

function handleFileUpload(file: File) {
  if (!file || !file.type.startsWith('image/')) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const src = e.target?.result as string;
    addLogoToCurrentView(src);
  };
  reader.readAsDataURL(file);
  fileInput.value = '';
}

function addLogoToCurrentView(src: string) {
  state.logos[state.view] = { src, x: 50, y: 50, width: 100 };
  renderLogo();
  checkLogoState();
}

function removeLogoFromCurrentView() {
  state.logos[state.view] = null;
  currentPrintArea.innerHTML = '';
  checkLogoState();
}

function checkLogoState() {
  if (state.logos[state.view]) {
    btnRemoveLogo.classList.remove('hidden');
  } else {
    btnRemoveLogo.classList.add('hidden');
  }
}

function renderLogo() {
  currentPrintArea.innerHTML = '';
  const logoState = state.logos[state.view];
  if (!logoState) return;

  const wrapper = document.createElement('div');
  wrapper.className = 'logo-wrapper';
  wrapper.style.left = `${logoState.x}%`;
  wrapper.style.top = `${logoState.y}%`;
  wrapper.style.width = `${logoState.width}px`;

  const img = document.createElement('img');
  img.src = logoState.src;
  img.className = 'draggable-logo';
  img.draggable = false;

  const resizeHandle = document.createElement('div');
  resizeHandle.className = 'resize-handle';

  wrapper.appendChild(img);
  wrapper.appendChild(resizeHandle);
  currentPrintArea.appendChild(wrapper);

  setupInteractions(wrapper, resizeHandle);
}

function setupInteractions(wrapper: HTMLDivElement, resizeBtn: HTMLDivElement) {
  let isDragging = false;
  let isResizing = false;

  let startClientX: number, startClientY: number;
  let startXPercent: number, startYPercent: number;
  let startWidth: number;

  wrapper.addEventListener('pointerdown', (e) => {
    if (e.target === resizeBtn) return;
    isDragging = true;
    startClientX = e.clientX;
    startClientY = e.clientY;
    startXPercent = state.logos[state.view]!.x;
    startYPercent = state.logos[state.view]!.y;
    wrapper.setPointerCapture(e.pointerId);
    e.preventDefault();
  });

  wrapper.addEventListener('pointermove', (e) => {
    if (!isDragging) return;
    const rect = currentPrintArea.getBoundingClientRect();
    const dx = e.clientX - startClientX;
    const dy = e.clientY - startClientY;
    const dxPercent = (dx / rect.width) * 100;
    const dyPercent = (dy / rect.height) * 100;

    let newX = startXPercent + dxPercent;
    let newY = startYPercent + dyPercent;

    wrapper.style.left = `${newX}%`;
    wrapper.style.top = `${newY}%`;

    state.logos[state.view]!.x = newX;
    state.logos[state.view]!.y = newY;
  });

  wrapper.addEventListener('pointerup', (e) => {
    if (isDragging) {
      isDragging = false;
      wrapper.releasePointerCapture(e.pointerId);
    }
  });

  resizeBtn.addEventListener('pointerdown', (e) => {
    isResizing = true;
    startClientX = e.clientX;
    startWidth = state.logos[state.view]!.width;
    resizeBtn.setPointerCapture(e.pointerId);
    e.stopPropagation();
    e.preventDefault();
  });

  resizeBtn.addEventListener('pointermove', (e) => {
    if (!isResizing) return;
    const dx = e.clientX - startClientX;
    const newWidth = Math.max(30, startWidth + dx);
    wrapper.style.width = `${newWidth}px`;
    state.logos[state.view]!.width = newWidth;
  });

  resizeBtn.addEventListener('pointerup', (e) => {
    if (isResizing) {
      isResizing = false;
      resizeBtn.releasePointerCapture(e.pointerId);
    }
  });
}

colorBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const color = btn.getAttribute('data-color') as ShirtColor;
    if (color) updateColor(color);
  });
});

btnFront.addEventListener('click', () => updateView('front'));
btnBack.addEventListener('click', () => updateView('back'));

uploadZone.addEventListener('click', () => fileInput.click());

uploadZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadZone.style.borderColor = 'var(--accent-color)';
});
uploadZone.addEventListener('dragleave', () => {
  uploadZone.style.borderColor = '';
});
uploadZone.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadZone.style.borderColor = '';
  if (e.dataTransfer?.files.length) {
    handleFileUpload(e.dataTransfer.files[0]);
  }
});

fileInput.addEventListener('change', (e) => {
  const files = (e.target as HTMLInputElement).files;
  if (files?.length) {
    handleFileUpload(files[0]);
  }
});

btnRemoveLogo.addEventListener('click', removeLogoFromCurrentView);

const btnBuyNow = document.getElementById('btnBuyNow') as HTMLButtonElement | null;
if (btnBuyNow) {
  btnBuyNow.addEventListener('click', () => {
    alert('¡Procesando tu compra! Redirigiendo a pasarela de pagos...');
  });
}

updateColor(state.color);
updateView(state.view);

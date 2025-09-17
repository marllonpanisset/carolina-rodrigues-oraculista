document.addEventListener('DOMContentLoaded', () => {
    const sliderTrack = document.querySelector('.slider-track');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const depoimentos = document.querySelectorAll('.depoimento');

    let currentIndex = 0;
    const slidesPerView = window.innerWidth <= 768 ? 1 : 2;
    const totalSlides = depoimentos.length;

    // Função para atualizar o slider
    const updateSlider = () => {
        // Calcula a largura de um depoimento, incluindo a margem
        const depoimentoWidth = depoimentos[0].offsetWidth + (parseFloat(getComputedStyle(depoimentos[0]).marginLeft) * 2);

        // Calcula a posição do transform
        const transformValue = -currentIndex * depoimentoWidth;
        sliderTrack.style.transform = `translateX(${transformValue}px)`;

        // Habilita/desabilita os botões
        prevBtn.disabled = currentIndex === 0;
        nextBtn.disabled = currentIndex >= totalSlides - slidesPerView;
    };

    // Função para mover para o próximo slide
    const slideNext = () => {
        if (currentIndex < totalSlides - slidesPerView) {
            currentIndex += slidesPerView;
            updateSlider();
        }
    };

    // Função para mover para o slide anterior
    const slidePrev = () => {
        if (currentIndex > 0) {
            currentIndex -= slidesPerView;
            updateSlider();
        }
    };

    // Event listeners para os botões
    nextBtn.addEventListener('click', slideNext);
    prevBtn.addEventListener('click', slidePrev);

    // Ajusta o slider quando a tela muda de tamanho
    window.addEventListener('resize', () => {
        const newSlidesPerView = window.innerWidth <= 768 ? 1 : 2;
        if (newSlidesPerView !== slidesPerView) {
            // Reinicia o slider para a primeira posição
            currentIndex = 0;
            updateSlider();
        }
    });

    // Inicializa o slider
    updateSlider();
});
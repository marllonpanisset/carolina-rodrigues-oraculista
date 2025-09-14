document.addEventListener('DOMContentLoaded', () => {
    const perguntasSelect = document.getElementById('perguntas');
    const valorPixSpan = document.getElementById('valor-pix');
    const formulario = document.getElementById('schedule-form');
    const chavePix = document.getElementById('chave-pix-texto').innerText;
    const copyButton = document.getElementById('copy-pix');
    const modal = document.getElementById('success-modal');
    const closeModal = document.querySelector('.close-button');
    const whatsappLink = document.getElementById('whatsapp-link');
    const horariosContainer = document.getElementById('horarios-disponiveis');

    // URL DO LINK DA SUA PLANILHA (O QUE FOI GERADO NO APPS SCRIPT)
    const GOOGLE_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxNgZjUa0SSfqscEmUk1H5x9ed1rLzTMcaZjNRB61oh0eCtXQdZIH42il0_KF0EXH0v/exec';

    const precos = {
        '1': 7.00,
        '2': 10.00,
        '4': 17.00,
        's-n': 1.00
    };

    const diasDaSemana = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

    function atualizarValorPix() {
        const quantidade = perguntasSelect.value;
        const valor = precos[quantidade] || 0.00;
        valorPixSpan.innerText = `R$ ${valor.toFixed(2).replace('.', ',')}`;
    }

    async function fetchHorarios() {
        try {
            const response = await fetch(GOOGLE_APPS_SCRIPT_URL);
            const data = await response.json();
            
            const horariosDisponiveis = data.filter(h => h.Disponivel === 'TRUE' && new Date(h.Data_e_Horario) > new Date());
            
            const horariosPorData = horariosDisponiveis.reduce((acc, h) => {
                const data = new Date(h.Data_e_Horario);
                const dataFormatada = data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
                const diaDaSemana = diasDaSemana[data.getDay()];
                const chave = `${diaDaSemana}, ${dataFormatada}`;
                
                if (!acc[chave]) {
                    acc[chave] = [];
                }
                acc[chave].push(h);
                return acc;
            }, {});
            
            renderHorarios(horariosPorData);
        } catch (error) {
            console.error("Erro ao buscar horários da planilha:", error);
            horariosContainer.innerHTML = '<p>Não foi possível carregar os horários. Tente novamente mais tarde.</p>';
        }
    }

    function renderHorarios(horariosPorData) {
        horariosContainer.innerHTML = '';
        const chavesOrdenadas = Object.keys(horariosPorData).sort((a, b) => new Date(a.split(',')[1].trim().split('/').reverse().join('-')) - new Date(b.split(',')[1].trim().split('/').reverse().join('-')));
        
        if (chavesOrdenadas.length === 0) {
            horariosContainer.innerHTML = '<p>Não há horários disponíveis no momento.</p>';
            return;
        }

        chavesOrdenadas.forEach(data => {
            const horariosDoDia = horariosPorData[data].sort((a, b) => new Date(a.Data_e_Horario) - new Date(b.Data_e_Horario));
            
            const tituloDia = document.createElement('h4');
            tituloDia.textContent = data;
            horariosContainer.appendChild(tituloDia);

            horariosDoDia.forEach(h => {
                const horarioFormatado = new Date(h.Data_e_Horario).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                const radioHtml = `
                    <div>
                        <input type="radio" id="${h.ID}" name="horario-escolhido" value="${h.Data_e_Horario}" required>
                        <label for="${h.ID}">${horarioFormatado}</label>
                    </div>
                `;
                horariosContainer.innerHTML += radioHtml;
            });
        });
    }

    // Evento de submissão do formulário
    formulario.addEventListener('submit', async (event) => {
        event.preventDefault();

        const nome = document.getElementById('nome').value;
        const dataNascimento = document.getElementById('data-nascimento').value;
        const perguntas = perguntasSelect.value;
        const horarioEscolhido = formulario.querySelector('input[name="horario-escolhido"]:checked');
        const comprovante = document.getElementById('comprovante').files[0];
        
        if (!horarioEscolhido || !comprovante) {
            alert('Por favor, selecione um horário e anexe o comprovante.');
            return;
        }
        
        const formData = new FormData();
        formData.append('horario-id', horarioEscolhido.id);
        formData.append('nome', nome);
        formData.append('data-nascimento', dataNascimento);
        formData.append('perguntas', perguntas);

        try {
            await fetch(GOOGLE_APPS_SCRIPT_URL, {
                method: 'POST',
                body: formData
            });

            const dataEHora = new Date(horarioEscolhido.value);
            const dataFormatada = dataEHora.toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            const mensagemWhatsapp = `Olá, Caroline! Fiz um agendamento. %0A%0A*Dados do Agendamento:*%0A- *Nome:* ${nome}%0A- *Data de Nascimento:* ${dataNascimento}%0A- *Quantidade de perguntas:* ${perguntasSelect.options[perguntasSelect.selectedIndex].text}%0A- *Horário Agendado:* ${dataFormatada}%0A%0AAnexei o comprovante no formulário do site. Poderíamos combinar o melhor horário?`;

            const numeroWhatsapp = '5521990896570';
            whatsappLink.href = `https://wa.me/${numeroWhatsapp}?text=${encodeURIComponent(mensagemWhatsapp)}`;
            
            modal.style.display = 'flex';
        } catch (error) {
            console.error('Erro ao agendar:', error);
            alert('Ocorreu um erro ao agendar. Por favor, tente novamente mais tarde.');
        }
    });

    // Eventos e funções já existentes
    perguntasSelect.addEventListener('change', atualizarValorPix);
    copyButton.addEventListener('click', () => {
        navigator.clipboard.writeText(chavePix).then(() => {
            alert('Chave Pix copiada para a área de transferência!');
        });
    });
    closeModal.addEventListener('click', () => {
        modal.style.display = 'none';
        formulario.reset();
        fetchHorarios();
    });
    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
            formulario.reset();
            fetchHorarios();
        }
    });

    fetchHorarios();
});
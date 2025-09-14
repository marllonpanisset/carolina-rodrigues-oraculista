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
    const dataInput = document.getElementById('data-consulta');

    // URL DO LINK DA SUA PLANILHA (O QUE FOI GERADO NO APPS SCRIPT)
    const GOOGLE_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxc0ld5tCPTf0SVC29Hmhr3GAM7s39KB6wg0JbvLn1vLhei3HWsdx17ryRhOHdcwUgpyg/exec';

    let todosOsHorarios = [];

    const precos = {
        '1': 7.00,
        '2': 10.00,
        '4': 17.00,
        's-n': 1.00
    };

    function atualizarValorPix() {
        const quantidade = perguntasSelect.value;
        const valor = precos[quantidade] || 0.00;
        valorPixSpan.innerText = `R$ ${valor.toFixed(2).replace('.', ',')}`;
    }

    async function fetchHorarios() {
        try {
            const response = await fetch(GOOGLE_APPS_SCRIPT_URL);
            const data = await response.json();
            
            todosOsHorarios = data.filter(h => String(h.Disponivel) === 'TRUE' && new Date(h.Data_e_Horario) > new Date());
            
            const hoje = new Date();
            const dataFormatada = hoje.toISOString().split('T')[0];
            dataInput.min = dataFormatada;

            renderHorariosParaData(dataFormatada);

        } catch (error) {
            console.error("Erro ao buscar horários da planilha:", error);
            horariosContainer.innerHTML = '<p>Não foi possível carregar os horários. Tente novamente mais tarde.</p>';
        }
    }

    function renderHorariosParaData(dataSelecionada) {
        horariosContainer.innerHTML = '';
        const horariosDoDia = todosOsHorarios.filter(h => {
            const dataHorario = new Date(h.Data_e_Horario);
            const dataFormatada = dataHorario.toISOString().split('T')[0];
            return dataFormatada === dataSelecionada;
        });

        const diaDaSemana = new Date(dataSelecionada + 'T00:00:00').getDay();

        if (horariosDoDia.length === 0) {
            if (diaDaSemana === 0 || diaDaSemana === 6) {
                horariosContainer.innerHTML = '<p>Não há agendamentos para fins de semana. Por favor, escolha um dia entre segunda e sexta-feira.</p>';
            } else {
                horariosContainer.innerHTML = '<p>Não há horários disponíveis para o dia selecionado. Por favor, escolha outra data.</p>';
            }
        } else {
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
        }
    }

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

    dataInput.addEventListener('change', (event) => {
        renderHorariosParaData(event.target.value);
    });
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
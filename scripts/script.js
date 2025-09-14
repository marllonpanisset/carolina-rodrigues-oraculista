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

    // SUA URL DO GOOGLE APPS SCRIPT (Web App publicado como "Me" + "Anyone, even anonymous")
    const GOOGLE_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzVi7T0ZnSBSWbg57VTTJdpKsTWJqrg9Kb00Y5qB33w-_od92cP7aDGdlcklxiZn_Bwyw/exec';

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

    // Carregar horários da planilha
    async function fetchHorarios() {
        try {
            const response = await fetch(GOOGLE_APPS_SCRIPT_URL, { method: "GET" });
            const data = await response.json();
            
            todosOsHorarios = data.filter(h => h.Disponivel === 'TRUE' && new Date(h.Data_e_Horario) > new Date());
            
            const hoje = new Date();
            const dataFormatada = hoje.toISOString().split('T')[0];
            dataInput.min = dataFormatada;

            renderHorariosParaData(dataFormatada);

        } catch (error) {
            console.error("Erro ao buscar horários:", error);
            horariosContainer.innerHTML = '<p>Erro ao carregar horários. Tente mais tarde.</p>';
        }
    }

    // Renderizar horários de uma data
    function renderHorariosParaData(dataSelecionada) {
        horariosContainer.innerHTML = '';
        const horariosDoDia = todosOsHorarios.filter(h => {
            const dataHorario = new Date(h.Data_e_Horario);
            return dataHorario.toISOString().split('T')[0] === dataSelecionada;
        });

        const diaDaSemana = new Date(dataSelecionada + 'T00:00:00').getDay();

        if (horariosDoDia.length === 0) {
            if (diaDaSemana === 0 || diaDaSemana === 6) {
                horariosContainer.innerHTML = '<p>Não há agendamentos em fins de semana. Escolha entre segunda e sexta-feira.</p>';
            } else {
                horariosContainer.innerHTML = '<p>Sem horários disponíveis para este dia.</p>';
            }
        } else {
            horariosDoDia.forEach(h => {
                const horarioFormatado = new Date(h.Data_e_Horario).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                horariosContainer.innerHTML += `
                    <div>
                        <input type="radio" id="${h.ID}" name="horario-escolhido" value="${h.Data_e_Horario}" required>
                        <label for="${h.ID}">${horarioFormatado}</label>
                    </div>
                `;
            });
        }
    }

    // Submissão do formulário
    formulario.addEventListener('submit', async (event) => {
        event.preventDefault();

        const nome = document.getElementById('nome').value;
        const dataNascimento = document.getElementById('data-nascimento').value;
        const perguntas = perguntasSelect.value;
        const horarioEscolhido = formulario.querySelector('input[name="horario-escolhido"]:checked');
        
        if (!horarioEscolhido) {
            alert('Selecione um horário.');
            return;
        }

        const formData = new FormData();
        formData.append('horario-id', horarioEscolhido.id);
        formData.append('nome', nome);
        formData.append('data-nascimento', dataNascimento);
        formData.append('perguntas', perguntas);

        try {
            const response = await fetch(GOOGLE_APPS_SCRIPT_URL, {
                method: 'POST',
                body: formData
            });
            const result = await response.json();

            if (result.status !== "success") {
                throw new Error("Erro no servidor Apps Script");
            }

            const dataEHora = new Date(horarioEscolhido.value);
            const dataFormatada = dataEHora.toLocaleDateString('pt-BR', {
                day: '2-digit', month: 'long', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });

            const mensagemWhatsapp = `Olá, Carolina! Fiz um agendamento. %0A%0A*Dados do Agendamento:*%0A- *Nome:* ${nome}%0A- *Nascimento:* ${dataNascimento}%0A- *Perguntas:* ${perguntasSelect.options[perguntasSelect.selectedIndex].text}%0A- *Horário:* ${dataFormatada}%0A%0AEnviarei o comprovante pelo WhatsApp.`;

            const numeroWhatsapp = '5521990896570';
            whatsappLink.href = `https://wa.me/${numeroWhatsapp}?text=${encodeURIComponent(mensagemWhatsapp)}`;
            
            modal.style.display = 'flex';
        } catch (error) {
            console.error('Erro ao agendar:', error);
            alert('Erro ao enviar agendamento. Tente novamente mais tarde.');
        }
    });

    // Eventos extras
    dataInput.addEventListener('change', e => renderHorariosParaData(e.target.value));
    perguntasSelect.addEventListener('change', atualizarValorPix);
    copyButton.addEventListener('click', () => {
        navigator.clipboard.writeText(chavePix).then(() => {
            alert('Chave Pix copiada!');
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

document.addEventListener('DOMContentLoaded', () => {
    // 1. Configuração do Supabase
    const SUPABASE_URL = 'https://zuydviwvfarqiwfcwbou.supabase.co'; 
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1eWR2aXd2ZmFycWl3ZmN3Ym91Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc4NzU2MTEsImV4cCI6MjA3MzQ1MTYxMX0.a5G6V5b8rhnjIsoyzluN_koc1gXKGJI-H5A9826bWLg';

    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // 2. Elementos do DOM
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

    // 3. Função que gera os horários possíveis para uma data
    function gerarHorariosParaData(dataSelecionada) {
        const data = new Date(dataSelecionada);
        const diaSemana = data.getDay(); // 0=Domingo, 1=Segunda, ..., 6=Sábado
        let horarios = [];

        if (diaSemana >= 1 && diaSemana <= 4) { 
            // Segunda a Quinta: 21h, 22h, 23h
            for (let h = 21; h <= 23; h++) {
                const horario = new Date(data);
                horario.setHours(h, 0, 0, 0);
                horarios.push(horario);
            }
            // 00h e 01h do dia seguinte
            const proximoDia = new Date(data);
            proximoDia.setDate(data.getDate() + 1);
            for (let h = 0; h <= 1; h++) {
                const horario = new Date(proximoDia);
                horario.setHours(h, 0, 0, 0);
                horarios.push(horario);
            }
        } else if (diaSemana === 5) {
            // Sexta: 16h às 20h
            for (let h = 16; h <= 20; h++) {
                const horario = new Date(data);
                horario.setHours(h, 0, 0, 0);
                horarios.push(horario);
            }
        }

        return horarios;
    }

    // 4. Renderiza os horários para a data escolhida
    async function renderHorariosParaData(dataSelecionada) {
        horariosContainer.innerHTML = '<p>Carregando...</p>';

        const horariosPossiveis = gerarHorariosParaData(dataSelecionada);

        if (horariosPossiveis.length === 0) {
            horariosContainer.innerHTML = '<p>Não há atendimento nesse dia.</p>';
            return;
        }

        try {
            // Busca horários já reservados no banco
            const { data: agendados, error } = await supabase
                .from('horarios')
                .select('data_e_horario')
                .gte('data_e_horario', `${dataSelecionada}T00:00:00`)
                .lt('data_e_horario', `${dataSelecionada}T23:59:59`);

            if (error) throw error;

            const ocupados = agendados?.map(a => new Date(a.data_e_horario).getTime()) || [];

            horariosContainer.innerHTML = '';

            horariosPossiveis.forEach(horario => {
                const timestamp = horario.getTime();
                const formatado = horario.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                const disabled = ocupados.includes(timestamp);

                const html = `
                    <div>
                        <input type="radio" id="${timestamp}" name="horario-escolhido" value="${horario.toISOString()}" ${disabled ? 'disabled' : ''} required>
                        <label for="${timestamp}" style="${disabled ? 'color: gray;' : ''}">
                            ${formatado} ${disabled ? '(indisponível)' : ''}
                        </label>
                    </div>
                `;
                horariosContainer.innerHTML += html;
            });

        } catch (err) {
            console.error("Erro ao carregar horários:", err);
            horariosContainer.innerHTML = '<p>Erro ao carregar horários.</p>';
        }
    }

    // 5. Função para agendar consulta
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

        try {
            // Insere no banco esse horário como reservado
            const { error } = await supabase
                .from('horarios')
                .insert([{
                    data_e_horario: horarioEscolhido.value,
                    nome: nome,
                    data_nascimento: dataNascimento,
                    perguntas: perguntas
                }]);

            if (error) throw error;

            const dataEHora = new Date(horarioEscolhido.value);
            const dataFormatada = dataEHora.toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            const mensagemWhatsapp = `Olá, Carolina! Fiz um agendamento. %0A%0A*Dados do Agendamento:*%0A- *Nome:* ${nome}%0A- *Data de Nascimento:* ${dataNascimento}%0A- *Quantidade de perguntas:* ${perguntasSelect.options[perguntasSelect.selectedIndex].text}%0A- *Horário Agendado:* ${dataFormatada}%0A%0AAnexei o comprovante no formulário do site. Poderíamos combinar o melhor horário?`;

            const numeroWhatsapp = '5521990896570';
            whatsappLink.href = `https://wa.me/${numeroWhatsapp}?text=${encodeURIComponent(mensagemWhatsapp)}`;

            modal.style.display = 'flex';
        } catch (error) {
            console.error('Erro ao agendar:', error);
            alert('Ocorreu um erro ao agendar. Por favor, tente novamente mais tarde.');
        }
    });

    // 6. Listeners
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
        horariosContainer.innerHTML = '<p>Selecione uma data para ver os horários.</p>';
    });
    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
            formulario.reset();
            horariosContainer.innerHTML = '<p>Selecione uma data para ver os horários.</p>';
        }
    });

    // 7. Configuração inicial
    const hoje = new Date();
    dataInput.min = hoje.toISOString().split('T')[0];
    horariosContainer.innerHTML = '<p>Selecione uma data para ver os horários.</p>';
});

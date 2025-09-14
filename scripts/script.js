document.addEventListener('DOMContentLoaded', () => {
    // 1. Substitua pelos dados do seu Supabase
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

    // 🔧 Função para gerar horários dinamicamente (sem precisar pré-popular no banco)
    function gerarHorariosParaData(dataSelecionada) {
        // Forçar parsing local da data (evita UTC deslocar para domingo)
        const [ano, mes, dia] = dataSelecionada.split('-').map(Number);
        const data = new Date(ano, mes - 1, dia); 

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

    // Buscar horários já reservados do banco
    async function fetchReservas(dataSelecionada) {
        try {
            const { data, error } = await supabase
                .from('horarios')
                .select('*')
                .gte('data_e_horario', `${dataSelecionada}T00:00:00.000Z`)
                .lte('data_e_horario', `${dataSelecionada}T23:59:59.999Z`);

            if (error) throw error;
            return data || [];
        } catch (err) {
            console.error("Erro ao buscar reservas:", err);
            return [];
        }
    }

    // Renderizar horários disponíveis
    async function renderHorariosParaData(dataSelecionada) {
        horariosContainer.innerHTML = '<p>Carregando horários...</p>';

        const todosHorarios = gerarHorariosParaData(dataSelecionada);
        const reservas = await fetchReservas(dataSelecionada);

        // Mapear os horários já reservados
        const reservadosSet = new Set(reservas.map(r => new Date(r.data_e_horario).getTime()));

        const disponiveis = todosHorarios.filter(h => !reservadosSet.has(h.getTime()));

        if (disponiveis.length === 0) {
            horariosContainer.innerHTML = '<p>Não há horários disponíveis para o dia selecionado.</p>';
        } else {
            horariosContainer.innerHTML = '';
            disponiveis.forEach(h => {
                const horarioFormatado = h.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                const iso = h.toISOString();
                const id = iso.replace(/[:.]/g, '-'); // id único
                const radioHtml = `
                    <div>
                        <input type="radio" id="${id}" name="horario-escolhido" value="${iso}" required>
                        <label for="${id}">${horarioFormatado}</label>
                    </div>
                `;
                horariosContainer.innerHTML += radioHtml;
            });
        }
    }

    // Submeter agendamento
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

            const mensagemWhatsapp = `Olá, Carolina! Fiz um agendamento.%0A%0A*Dados do Agendamento:*%0A- *Nome:* ${nome}%0A- *Data de Nascimento:* ${dataNascimento}%0A- *Quantidade de perguntas:* ${perguntasSelect.options[perguntasSelect.selectedIndex].text}%0A- *Horário Agendado:* ${dataFormatada}%0A%0AAnexei o comprovante no formulário do site. Poderíamos combinar o melhor horário?`;

            const numeroWhatsapp = '5521990896570';
            whatsappLink.href = `https://wa.me/${numeroWhatsapp}?text=${mensagemWhatsapp}`;

            modal.style.display = 'flex';
        } catch (error) {
            console.error('Erro ao agendar:', error);
            alert('Ocorreu um erro ao agendar. Por favor, tente novamente mais tarde.');
        }
    });

    // Listeners
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
        if (dataInput.value) {
            renderHorariosParaData(dataInput.value);
        }
    });

    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
            formulario.reset();
            if (dataInput.value) {
                renderHorariosParaData(dataInput.value);
            }
        }
    });

    // Definir data mínima e carregar horários de hoje
    const hoje = new Date();
    const dataFormatada = hoje.toISOString().split('T')[0];
    dataInput.min = dataFormatada;
    renderHorariosParaData(dataFormatada);
});

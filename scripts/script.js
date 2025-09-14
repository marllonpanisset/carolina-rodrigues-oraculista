document.addEventListener('DOMContentLoaded', () => {
    // 1. Substitua os valores abaixo pelo URL e a chave da sua API do Supabase
    const SUPABASE_URL = 'https://zuydviwvfarqiwfcwbou.supabase.co'; 
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1eWR2aXd2ZmFycWl3ZmN3Ym91Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc4NzU2MTEsImV4cCI6MjA3MzQ1MTYxMX0.a5G6V5b8rhnjIsoyzluN_koc1gXKGJI-H5A9826bWLg';

    const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // 2. Elementos do DOM e dados
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

    // 3. Função para buscar horários do Supabase
    async function fetchHorarios() {
        try {
            const { data, error } = await supabase
                .from('horarios')
                .select('*')
                .eq('disponivel', true)
                .order('data_e_horario', { ascending: true });

            if (error) throw error;
            
            todosOsHorarios = data;
            
            const hoje = new Date();
            const dataFormatada = hoje.toISOString().split('T')[0];
            dataInput.min = dataFormatada;

            renderHorariosParaData(dataFormatada);

        } catch (error) {
            console.error("Erro ao buscar horários:", error);
            horariosContainer.innerHTML = '<p>Não foi possível carregar os horários. Tente novamente mais tarde.</p>';
        }
    }

    // 4. Função para renderizar os horários na página
    function renderHorariosParaData(dataSelecionada) {
        horariosContainer.innerHTML = '';
        const horariosDoDia = todosOsHorarios.filter(h => {
            const dataHorario = new Date(h.data_e_horario);
            const dataFormatada = dataHorario.toISOString().split('T')[0];
            return dataFormatada === dataSelecionada;
        });

        if (horariosDoDia.length === 0) {
            horariosContainer.innerHTML = '<p>Não há horários disponíveis para o dia selecionado. Por favor, escolha outra data.</p>';
        } else {
            horariosDoDia.forEach(h => {
                const horarioFormatado = new Date(h.data_e_horario).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                const radioHtml = `
                    <div>
                        <input type="radio" id="${h.id}" name="horario-escolhido" value="${h.data_e_horario}" required>
                        <label for="${h.id}">${horarioFormatado}</label>
                    </div>
                `;
                horariosContainer.innerHTML += radioHtml;
            });
        }
    }

    // 5. Função para agendar a consulta
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
        
        // TODO: Lidar com o upload do comprovante para o Supabase Storage
        // A lógica de upload de arquivos é um pouco mais complexa e vamos tratar depois de resolver o agendamento.

        try {
            const { error } = await supabase
                .from('horarios')
                .update({ 
                    disponivel: false,
                    nome: nome,
                    data_nascimento: dataNascimento,
                    perguntas: perguntas
                })
                .eq('id', horarioEscolhido.id);

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

    // 6. Listeners para os elementos da página
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

    // 7. Chamada inicial
    fetchHorarios();
});
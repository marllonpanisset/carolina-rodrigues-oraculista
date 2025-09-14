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

  // COLE AQUI a URL do Web App após novo Deploy
  const GOOGLE_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwNwoUTnL9xJkzlQZnre2gmqDMcqrJqzvhr4ElxpFycybDXT6eB7i43OPXVA7yKXkXq0A/exec';

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
      const response = await fetch(GOOGLE_APPS_SCRIPT_URL, { method: 'GET' });
      const data = await response.json();

      todosOsHorarios = data.filter(h => String(h.Disponivel) === 'TRUE' && new Date(h.Data_e_Horario) > new Date());

      const hoje = new Date();
      const dataFormatada = hoje.toISOString().split('T')[0];
      dataInput.min = dataFormatada;

      renderHorariosParaData(dataFormatada);
    } catch (err) {
      console.error('Erro ao buscar horários:', err);
      horariosContainer.innerHTML = '<p>Não foi possível carregar os horários. Tente novamente mais tarde.</p>';
    }
  }

  function renderHorariosParaData(dataSelecionada) {
    horariosContainer.innerHTML = '';
    const horariosDoDia = todosOsHorarios.filter(h => {
      const dataHorario = new Date(h.Data_e_Horario);
      return dataHorario.toISOString().split('T')[0] === dataSelecionada;
    });

    const diaDaSemana = new Date(dataSelecionada + 'T00:00:00').getDay();

    if (horariosDoDia.length === 0) {
      if (diaDaSemana === 0 || diaDaSemana === 6) {
        horariosContainer.innerHTML = '<p>Não há agendamentos para fins de semana. Escolha entre segunda e sexta-feira.</p>';
      } else {
        horariosContainer.innerHTML = '<p>Não há horários disponíveis para este dia. Escolha outra data.</p>';
      }
      return;
    }

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

  async function bookHorario(params) {
    const formData = new FormData();
    Object.keys(params).forEach(k => formData.append(k, params[k]));

    const res = await fetch(GOOGLE_APPS_SCRIPT_URL, { method: 'POST', body: formData });
    return await res.json();
  }

  formulario.addEventListener('submit', async (event) => {
    event.preventDefault();

    const nome = document.getElementById('nome').value.trim();
    const dataNascimento = document.getElementById('data-nascimento').value;
    const perguntas = perguntasSelect.value;
    const horarioEscolhido = formulario.querySelector('input[name="horario-escolhido"]:checked');

    if (!horarioEscolhido) {
      alert('Por favor, selecione um horário.');
      return;
    }

    try {
      const result = await bookHorario({
        'horario-id': horarioEscolhido.id,
        nome,
        'data-nascimento': dataNascimento,
        perguntas
      });

      if (!result || result.status !== 'success') {
        throw new Error(result && result.message ? result.message : 'Erro ao reservar');
      }

      const dataEHora = new Date(horarioEscolhido.value);
      const dataFormatada = dataEHora.toLocaleDateString('pt-BR', {
        day: '2-digit', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });

      const mensagemWhatsapp = `Olá, Carolina! Fiz um agendamento.%0A%0A*Dados:*%0A- *Nome:* ${nome}%0A- *Nascimento:* ${dataNascimento}%0A- *Perguntas:* ${perguntasSelect.options[perguntasSelect.selectedIndex].text}%0A- *Horário:* ${dataFormatada}`;

      whatsappLink.href = `https://wa.me/5521990896570?text=${mensagemWhatsapp}`;
      modal.style.display = 'flex';
    } catch (error) {
      console.error('Erro ao agendar:', error);
      alert('Ocorreu um erro ao agendar. Tente novamente mais tarde.');
    }
  });

  dataInput.addEventListener('change', (e) => renderHorariosParaData(e.target.value));
  perguntasSelect.addEventListener('change', atualizarValorPix);
  copyButton.addEventListener('click', () => {
    navigator.clipboard.writeText(chavePix).then(() => alert('Chave Pix copiada!'));
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

  atualizarValorPix();
  fetchHorarios();
});

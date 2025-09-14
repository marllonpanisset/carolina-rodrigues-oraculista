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

  // COLE AQUI A URL do seu Web App (a fornecida ao fazer Deploy)
  const GOOGLE_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxuShtG0KERc4NkE0LsHLT7TWMBWOlMePQDhmXUc1QlFSN-UAPjKy1zCNj7cxl8beC05Q/exec';

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

  // helper: carregar JSONP (retorna Promise)
  function loadJSONP(url, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const callbackName = '__gapps_cb_' + Date.now() + '_' + Math.floor(Math.random()*10000);
      const script = document.createElement('script');

      window[callbackName] = function(data) {
        cleanup();
        resolve(data);
      };

      script.src = url + (url.indexOf('?') === -1 ? '?' : '&') + 'callback=' + callbackName;
      script.async = true;
      script.onerror = function() {
        cleanup();
        reject(new Error('JSONP load error'));
      };

      const timer = setTimeout(() => {
        cleanup();
        reject(new Error('JSONP timeout'));
      }, timeout);

      function cleanup() {
        clearTimeout(timer);
        if (script.parentNode) script.parentNode.removeChild(script);
        try { delete window[callbackName]; } catch (e) { window[callbackName] = undefined; }
      }

      document.body.appendChild(script);
    });
  }

  // helper: construir query string
  function buildQuery(params) {
    return Object.keys(params).map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[k])).join('&');
  }

  // Tenta fetch normal e faz fallback para JSONP se necessário
  async function fetchHorarios() {
    try {
      const response = await fetch(GOOGLE_APPS_SCRIPT_URL, { method: 'GET' });
      // se o servidor responder 200 mas sem CORS o navegador já teria bloqueado e ido para catch
      const data = await response.json();
      processHorariosData(data);
    } catch (err) {
      console.warn('fetch failed — tentando JSONP fallback:', err);
      try {
        const data = await loadJSONP(GOOGLE_APPS_SCRIPT_URL);
        processHorariosData(data);
      } catch (err2) {
        console.error('JSONP fallback também falhou:', err2);
        horariosContainer.innerHTML = '<p>Não foi possível carregar os horários. Tente novamente mais tarde.</p>';
      }
    }
  }

  function processHorariosData(data) {
    // filtra somente disponíveis e futuras (assume campos 'Disponivel' e 'Data_e_Horario')
    todosOsHorarios = (data || []).filter(h => String(h.Disponivel) === 'TRUE' && new Date(h.Data_e_Horario) > new Date());

    const hoje = new Date();
    const dataFormatada = hoje.toISOString().split('T')[0];
    dataInput.min = dataFormatada;
    renderHorariosParaData(dataFormatada);
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
        horariosContainer.innerHTML = '<p>Não há agendamentos para fins de semana. Por favor, escolha um dia entre segunda e sexta-feira.</p>';
      } else {
        horariosContainer.innerHTML = '<p>Não há horários disponíveis para o dia selecionado. Por favor, escolha outra data.</p>';
      }
      return;
    }

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

  // Faz o "booking" via JSONP (fallback) ou via fetch se possível
  async function bookHorario(params) {
    // params: { 'horario-id', nome, 'data-nascimento', perguntas }
    // Primeiro tenta fetch (pode falhar por CORS preflight)
    try {
      // Tentar GET simples com parâmetros (não POST) — evita preflight
      const url = GOOGLE_APPS_SCRIPT_URL + '?' + buildQuery(Object.assign({ action: 'book' }, params));
      const res = await fetch(url, { method: 'GET' });
      const json = await res.json();
      return json;
    } catch (err) {
      // fallback JSONP
      try {
        const url = GOOGLE_APPS_SCRIPT_URL + '?' + buildQuery(Object.assign({ action: 'book' }, params));
        const data = await loadJSONP(url);
        return data;
      } catch (err2) {
        throw err2;
      }
    }
  }

  // Submissão do formulário
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

    // Não enviamos arquivo ao Apps Script (envio do comprovante via WhatsApp)
    const params = {
      'horario-id': horarioEscolhido.id,
      nome: nome,
      'data-nascimento': dataNascimento,
      perguntas: perguntas
    };

    try {
      const result = await bookHorario(params);
      if (!result || result.status !== 'success') {
        throw new Error((result && result.message) ? result.message : 'Erro ao reservar');
      }

      const dataEHora = new Date(horarioEscolhido.value);
      const dataFormatada = dataEHora.toLocaleDateString('pt-BR', {
        day: '2-digit', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });

      const mensagemWhatsapp = `Olá, Carolina! Fiz um agendamento. %0A%0A*Dados do Agendamento:*%0A- *Nome:* ${nome}%0A- *Data de Nascimento:* ${dataNascimento}%0A- *Quantidade de perguntas:* ${perguntasSelect.options[perguntasSelect.selectedIndex].text}%0A- *Horário Agendado:* ${dataFormatada}%0A%0AEnviarei o comprovante pelo WhatsApp.`;

      const numeroWhatsapp = '5521990896570';
      whatsappLink.href = `https://wa.me/${numeroWhatsapp}?text=${encodeURIComponent(mensagemWhatsapp)}`;

      modal.style.display = 'flex';
    } catch (error) {
      console.error('Erro ao agendar:', error);
      alert('Ocorreu um erro ao agendar. Tente novamente mais tarde.');
    }
  });

  // Eventos
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

  // inicialização
  atualizarValorPix();
  fetchHorarios();
});

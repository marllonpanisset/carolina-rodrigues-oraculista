// Inicializa Supabase
const supabaseUrl = "https://zuydviwvfarqiwfcwbou.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1eWR2aXd2ZmFycWl3ZmN3Ym91Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc4NzU2MTEsImV4cCI6MjA3MzQ1MTYxMX0.a5G6V5b8rhnjIsoyzluN_koc1gXKGJI-H5A9826bWLg";
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

const form = document.getElementById("schedule-form");
const horariosDiv = document.getElementById("horarios-disponiveis");
const perguntasSelect = document.getElementById("perguntas");
const dataConsultaInput = document.getElementById("data-consulta");
const valorPixSpan = document.getElementById("valor-pix");
const chavePixTexto = document.getElementById("chave-pix-texto");
const copyPixBtn = document.getElementById("copy-pix");

let duracaoSelecionada = 30; // padrão

// Mapeamento quantidade de perguntas -> duração e valor
const opcoes = {
  "1": { duracao: 30, valor: "R$ 10,00" },
  "2": { duracao: 30, valor: "R$ 15,00" },
  "4": { duracao: 30, valor: "R$ 20,00" },
  "s-n": { duracao: 30, valor: "R$ 3,77" },
  "30min": { duracao: 30, valor: "R$ 57,00" },
  "1h": { duracao: 60, valor: "R$ 77,00" },
};

// Atualiza valor do Pix e duração ao escolher perguntas
perguntasSelect.addEventListener("change", () => {
  const selected = perguntasSelect.value;
  if (opcoes[selected]) {
    duracaoSelecionada = opcoes[selected].duracao;
    valorPixSpan.textContent = opcoes[selected].valor;
  } else {
    duracaoSelecionada = 30;
    valorPixSpan.textContent = "R$ 0,00";
  }

  // limpa horários quando muda a opção
  horariosDiv.innerHTML = "<p>Selecione uma data...</p>";
  dataConsultaInput.value = "";
});

// Ao escolher data -> carregar horários disponíveis
dataConsultaInput.addEventListener("change", async () => {
  const data = dataConsultaInput.value;
  if (!data || !duracaoSelecionada) return;

  horariosDiv.innerHTML = "<p>Carregando horários...</p>";

  const { data: agendamentos, error } = await supabase
    .from("agendamentos")
    .select("horario, duracao")
    .eq("data_consulta", data);

  if (error) {
    console.error("Erro Supabase:", error.message, error.details);
    horariosDiv.innerHTML = "<p>Erro ao carregar horários.</p>";
    return;
  }

  // Gera lista de horários conforme o dia da semana
  const horariosGerados = gerarHorarios(duracaoSelecionada, data);

  if (horariosGerados.length === 0) {
    horariosDiv.innerHTML =
      "<p>Nenhum horário disponível para esse dia.</p>";
    return;
  }

  // Remove horários já ocupados
  const horariosOcupados = agendamentos.map((a) => a.horario);
  const horariosDisponiveis = horariosGerados.filter(
    (h) => !horariosOcupados.includes(h)
  );

  // Renderiza
  if (horariosDisponiveis.length === 0) {
    horariosDiv.innerHTML = "<p>Nenhum horário disponível.</p>";
  } else {
    horariosDiv.innerHTML = "";
    horariosDisponiveis.forEach((hora) => {
      const label = document.createElement("label");
      label.classList.add("horario-label");

      const input = document.createElement("input");
      input.type = "radio";
      input.name = "horario";
      input.value = hora;

      const span = document.createElement("span");
      span.textContent = hora.slice(0, 5);

      input.addEventListener("change", () => {
        form.dataset.horario = hora;
      });

      label.appendChild(input);
      label.appendChild(span);
      horariosDiv.appendChild(label);
    });
  }
});

// Gera horários (30 ou 60 minutos) no formato HH:mm:ss
function gerarHorarios(intervalo, dataSelecionada) {
  const horarios = [];
  // Corrige fuso horário UTC -> local
  const data = new Date(dataSelecionada + "T00:00:00");
  const diaSemana = data.getDay(); // 0 = domingo, 1 = segunda, ..., 6 = sábado

  // Segunda a quinta → 21h até 01h
  if (diaSemana >= 1 && diaSemana <= 4) {
    horarios.push(...intervalosEntre(21, 24, intervalo));
    horarios.push(...intervalosEntre(0, 1, intervalo));
  }
  // Sexta → 16h até 20h
  else if (diaSemana === 5) {
    horarios.push(...intervalosEntre(16, 20, intervalo));
  }
  // Sábado (6) e Domingo (0) → sem horários
  else {
    return [];
  }

  return horarios;
}

// Função auxiliar para gerar intervalos
function intervalosEntre(horaInicio, horaFim, intervalo) {
  const lista = [];
  let hora = horaInicio;
  let minuto = 0;
  while (hora < horaFim) {
    lista.push(
      `${hora.toString().padStart(2, "0")}:${minuto
        .toString()
        .padStart(2, "0")}:00`
    );
    minuto += intervalo;
    if (minuto >= 60) {
      minuto = 0;
      hora++;
    }
  }
  return lista;
}

// Copiar chave Pix
copyPixBtn.addEventListener("click", () => {
  navigator.clipboard.writeText(chavePixTexto.textContent).then(() => {
    alert("Chave Pix copiada!");
  });
});

// Envio do formulário
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const nome = form.nome.value;
  const nascimento = form["data-nascimento"].value;
  const dataConsulta = form["data-consulta"].value;
  const perguntas = form.perguntas.value;
  const comprovante = form.comprovante.files[0];
  const horario = form.dataset.horario;

  // NOVAS VARIÁVEIS PARA A MENSAGEM DO WHATSAPP
  const perguntasTexto = perguntasSelect.options[perguntasSelect.selectedIndex].text;
  const valorPix = valorPixSpan.textContent;

  if (!horario) {
    alert("Selecione um horário antes de agendar.");
    return;
  }

    // código de upload de comprovante
    
    //   const { data: fileData, error: uploadError } = await supabase.storage
    //     .from("comprovantes")
    //     .upload(`comprovantes/${Date.now()}-${comprovante.name}`, comprovante);

    //   if (uploadError) {
    //     console.error(uploadError);
    //     alert("Erro ao enviar comprovante.");
    //     return;
    //   }

  // Salvar no banco
  const { error } = await supabase.from("agendamentos").insert([
    {
      nome,
      data_nascimento: nascimento,
      data_consulta: dataConsulta,
      horario,
      perguntas,
      duracao: duracaoSelecionada,
      // comprovante: fileData.path,
    },
  ]);

  if (error) {
    console.error(error);
    alert("Erro ao salvar agendamento.");
  } else {
    document.getElementById("success-modal").style.display = "flex";
    
    // ATUALIZA O LINK DO BOTÃO DO WHATSAPP
    const mensagemWhatsapp = `Olá Carolina, agendei meu atendimento para:%0A`
    + `dia ${dataConsulta} às ${horario.slice(0, 5)} horas%0A`
    + `realizei o pagamento no valor de ${valorPix}%0A`
    + `referente a opção "${perguntasTexto}"`;

    document.getElementById("whatsapp-link").href = `https://wa.me/5521990896570?text=${encodeURIComponent(mensagemWhatsapp)}`;
  }
});
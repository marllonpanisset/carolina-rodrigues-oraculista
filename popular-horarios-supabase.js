const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Erro: SUPABASE_URL ou SUPABASE_KEY não estão definidos no arquivo .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function popularHorarios() {
  const horarios = [];
  
  // Apaga todos os horários existentes para evitar duplicação
  console.log("Apagando horários existentes...");
  const { data: deleteData, error: deleteError } = await supabase
    .from('horarios')
    .delete()
    .neq('id', '0');

  if (deleteError) {
    console.error("Erro ao apagar horários existentes:", deleteError);
  } else {
    console.log("Horários existentes apagados com sucesso.");
  }

  const hoje = new Date();
  
  for (let i = 0; i < 7; i++) {
    const dataAtual = new Date(hoje);
    dataAtual.setDate(hoje.getDate() + i);
    
    const diaDaSemana = dataAtual.getDay(); // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
    
    // Regra: Segunda (1) a Quinta (4)
    if (diaDaSemana >= 1 && diaDaSemana <= 4) {
      // Horários de 21:00, 22:00, 23:00 do dia atual
      for (let hora = 21; hora <= 23; hora++) {
        const dataEHorario = new Date(dataAtual);
        dataEHorario.setHours(hora, 0, 0, 0);
        horarios.push({ data_e_horario: dataEHorario, disponivel: true });
      }
      
      // Horários de 00:00 e 01:00 do dia seguinte
      const proximoDia = new Date(dataAtual);
      proximoDia.setDate(dataAtual.getDate() + 1);
      
      const meiaNoite = new Date(proximoDia);
      meiaNoite.setHours(0, 0, 0, 0);
      horarios.push({ data_e_horario: meiaNoite, disponivel: true });
      
      const umaDaManha = new Date(proximoDia);
      umaDaManha.setHours(1, 0, 0, 0);
      horarios.push({ data_e_horario: umaDaManha, disponivel: true });
    }

    // Regra: Sexta-feira (5)
    if (diaDaSemana === 5) {
      for (let hora = 16; hora <= 20; hora++) {
        const dataEHorario = new Date(dataAtual);
        dataEHorario.setHours(hora, 0, 0, 0);
        horarios.push({ data_e_horario: dataEHorario, disponivel: true });
      }
    }
  }

  // Insere os novos horários
  const { data, error } = await supabase
    .from('horarios')
    .insert(horarios.map(h => ({ data_e_horario: h.data_e_horario.toISOString(), disponivel: true })));

  if (error) {
    console.error('Erro ao inserir horários:', error);
  } else {
    console.log('Horários gerados e inseridos com sucesso!');
  }
}

popularHorarios();
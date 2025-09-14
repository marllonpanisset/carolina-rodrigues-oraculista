// Instale a biblioteca do Supabase: npm install @supabase/supabase-js
const { createClient } = require('@supabase/supabase-js');

// Substitua com as suas informações do Supabase
const SUPABASE_URL = 'https://zuydviwvfarqiwfcwbou.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1eWR2aXd2ZmFycWl3ZmN3Ym91Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc4NzU2MTEsImV4cCI6MjA3MzQ1MTYxMX0.a5G6V5b8rhnjIsoyzluN_koc1gXKGJI-H5A9826bWLg';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function gerarHorarios() {
    console.log("Gerando horários para os próximos 7 dias...");

    const horariosInserir = [];
    const hoje = new Date();

    // Defina seus horários aqui, como você fez na planilha
    const horariosSemana = ['21:00', '22:30', '00:00'];
    const horariosSexta = ['16:00', '17:30', '19:00'];

    for (let i = 0; i < 7; i++) {
        const dataDoDia = new Date(hoje);
        dataDoDia.setDate(hoje.getDate() + i);
        const diaDaSemana = dataDoDia.getDay();

        let horariosDoDia = [];
        if (diaDaSemana >= 1 && diaDaSemana <= 4) {
            horariosDoDia = horariosSemana;
        } else if (diaDaSemana === 5) {
            horariosDoDia = horariosSexta;
        }

        horariosDoDia.forEach(horario => {
            const [hora, minuto] = horario.split(':');
            const dataCompleta = new Date(dataDoDia);
            dataCompleta.setHours(hora, minuto, 0, 0);

            horariosInserir.push({
                data_e_horario: dataCompleta.toISOString(),
                disponivel: true,
            });
        });
    }

    // Insere os horários no Supabase
    const { data, error } = await supabase
        .from('horarios')
        .insert(horariosInserir);

    if (error) {
        console.error("Erro ao inserir horários:", error);
    } else {
        console.log("Horários gerados e inseridos com sucesso!");
        console.log("Confira sua tabela no Supabase para ver os novos horários.");
    }
}

gerarHorarios();
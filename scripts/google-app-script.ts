function doGet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const data = sheet.getDataRange().getValues();
  const headers = data.shift();
  const result = [];
  
  data.forEach((row) => {
    const rowObject = {};
    headers.forEach((header, index) => {
      rowObject[header] = row[index];
    });
    result.push(rowObject);
  });
  
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const data = e.parameter;
  const idToUpdate = data['horario-id'];
  
  const nomeConsulente = data['nome'];
  const dataNascimento = data['data-nascimento'];
  const quantidadePerguntas = data['perguntas'];
  
  const range = sheet.getDataRange();
  const values = range.getValues();
  
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] == idToUpdate) {
      sheet.getRange(i + 1, 3).setValue('FALSE');
      sheet.getRange(i + 1, 4).setValue(nomeConsulente);
      sheet.getRange(i + 1, 5).setValue(dataNascimento);
      sheet.getRange(i + 1, 6).setValue(quantidadePerguntas);

      return ContentService.createTextOutput(JSON.stringify({ status: 'success' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'ID not found' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function gerarHorarios() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const ultimaLinha = sheet.getLastRow();
  const ultimaID = (ultimaLinha > 1) ? sheet.getRange(ultimaLinha, 1).getValue() : 0;
  let newID = ultimaID;
  const hoje = new Date();

  // Define os horários de segunda a quinta
  const horariosSemana = ['21:00', '22:30', '00:00'];
  // Define os horários de sexta
  const horariosSexta = ['16:00', '17:30', '19:00'];

  // Gera horários para a próxima semana
  for (let i = 1; i <= 7; i++) {
    const dataDoDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + i);
    const diaDaSemana = dataDoDia.getDay(); // 0 = Domingo, 1 = Segunda...

    let horariosDoDia = [];
    if (diaDaSemana >= 1 && diaDaSemana <= 4) { // Segunda a Quinta
      horariosDoDia = horariosSemana;
    } else if (diaDaSemana === 5) { // Sexta
      horariosDoDia = horariosSexta;
    }

    horariosDoDia.forEach(horario => {
      newID++;
      const dataCompleta = Utilities.formatDate(dataDoDia, "GMT-3", "yyyy-MM-dd") + ' ' + horario;
      sheet.appendRow([newID, dataCompleta, 'TRUE', '', '', '']);
    });
  }
}
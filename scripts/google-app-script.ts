// Apps Script - web app que suporta listagem e "booking" via GET
// Publique como Web App: Execute as = Me, Who has access = Anyone, even anonymous
function doGet(e) {
  const action = (e.parameter.action || 'list').toString();
  const callback = e.parameter.callback; // se presente, retornamos JSONP
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getActiveSheet();

  if (action === 'book') {
    // parâmetros esperados: horario-id, nome, data-nascimento, perguntas
    const idToUpdate = e.parameter['horario-id'];
    const nomeConsulente = e.parameter['nome'] || '';
    const dataNascimento = e.parameter['data-nascimento'] || '';
    const quantidadePerguntas = e.parameter['perguntas'] || '';

    const range = sheet.getDataRange();
    const values = range.getValues();

    let found = false;
    for (let i = 1; i < values.length; i++) {
      // compara como string para evitar mismatch de tipos
      if (String(values[i][0]) === String(idToUpdate)) {
        sheet.getRange(i + 1, 3).setValue('FALSE'); // coluna Disponivel
        sheet.getRange(i + 1, 4).setValue(nomeConsulente);
        sheet.getRange(i + 1, 5).setValue(dataNascimento);
        sheet.getRange(i + 1, 6).setValue(quantidadePerguntas);
        found = true;
        break;
      }
    }

    const result = found ? { status: 'success' } : { status: 'error', message: 'ID not found' };
    const payload = JSON.stringify(result);
    if (callback) {
      return ContentService.createTextOutput(callback + '(' + payload + ')').setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    return ContentService.createTextOutput(payload).setMimeType(ContentService.MimeType.JSON);
  }

  // default: action === 'list' -> retorna todos os horários
  const data = sheet.getDataRange().getValues();
  const headers = data.shift() || [];
  const result = [];
  data.forEach(row => {
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = row[idx];
    });
    result.push(obj);
  });

  const output = JSON.stringify(result);
  if (callback) {
    return ContentService.createTextOutput(callback + '(' + output + ')').setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(output).setMimeType(ContentService.MimeType.JSON);
}

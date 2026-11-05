(() => {
  async function loadWithPaymentFallback() {
    const button = document.querySelector('#refresh');
    button.disabled = true;
    button.textContent = 'Actualizando…';
    try {
      const [payments, metas, matrix] = await Promise.all([source(PAYMENTS), source(METAS), source(MATRIX)]);
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const requested = document.querySelector('#monthPicker').value;
      const selected = requested ? new Date(`${requested}-01T00:00:00`) : null;
      const normalized = payments.map(r => ({ ...r, _date: date(get(r, 'FECHA')) }));
      let paid = selected ? normalized.filter(r => key(r._date) === key(selected)) : normalized.filter(r => key(r._date) === key(start));
      let period = selected || start;
      if (!selected && !paid.length) { paid = normalized.filter(r => key(r._date) === key(prev)); period = prev; }
      const matrixMap = new Map(matrix.map(r => [id(get(r, 'ID')), r]));
      const metasMap = new Map(metas.map(r => [`${key(date(get(r, 'MES')))}|${norm(get(r, 'TIPO DE CARTERA'))}`, amount(get(r, 'META'))]));
      const rows = paid.map(r => {
        const base = matrixMap.get(id(get(r, 'ID CLIENTE')));
        const paymentClass = norm(get(r, 'CASTIGO/VIGENTE'));
        const classifiedInPayments = paymentClass.includes('CASTIG') || paymentClass.includes('VIGENTE');
        const modulo = get(base || {}, 'MODULO');
        const cartera = base ? ((modulo === '141' || modulo === '241') ? 'CASTIGO' : 'VIGENTE') : (paymentClass.includes('CASTIG') ? 'CASTIGO' : 'VIGENTE');
        const antiguedad = base ? get(base, 'ANTIGÜEDAD_JUDICIAL', 'ANTIGUEDAD JUDICIAL') : get(r, 'ANTIGUEDAD');
        const cuota = get(r, 'NRO DE CUOTA SI TUVIERA CONVENIO');
        return { gestor:get(r,'GESTOR'), client:id(get(r,'ID CLIENTE')), monto:amount(get(r,'MONTO')), matched:!!base || classifiedInPayments, matrixMatch:!!base, cartera, antiguedad, route:cuota ? 'CUOTA REFINANCIADA/FRACCIONADA' : norm(antiguedad).includes('MENOR') ? 'MENOR A 1 AÑO' : 'MAYOR A 1 AÑO', tasa:null, comision:0 };
      });
      const groups = {};
      ['VIGENTE','CASTIGO'].forEach(type => groups[type] = { meta:metasMap.get(`${key(period)}|${type}`) || 0, total:0, compliance:0, commission:0, rateText:'' });
      const data = { period, usedCurrent:!selected && !!normalized.filter(r => key(r._date) === key(start)).length, userSelected:!!selected, rows, groups };
      recalc(data);
      render(data);
    } catch (error) { console.error(error); }
    finally { button.disabled = false; button.textContent = 'Actualizar datos'; }
  }

  setTimeout(() => {
    const oldButton = document.querySelector('#refresh');
    const newButton = oldButton.cloneNode(true);
    oldButton.replaceWith(newButton);
    const oldPicker = document.querySelector('#monthPicker');
    const newPicker = oldPicker.cloneNode(true);
    oldPicker.replaceWith(newPicker);
    newButton.addEventListener('click', loadWithPaymentFallback);
    newPicker.addEventListener('change', loadWithPaymentFallback);
    loadWithPaymentFallback();
  }, 2500);
})();

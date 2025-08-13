// Año footer
document.getElementById('year').textContent = new Date().getFullYear();

/**
 * Banco de preguntas. Cada pregunta:
 * - id: clave única
 * - type: "single" (una correcta)
 * - prompt: texto de la pregunta
 * - context: bloque opcional (preformat) con info
 * - options: {key, label} posibles respuestas
 * - correct: key correcta
 * - explain: explicación detallada
 */
const QUESTIONS = [
  {
    id: "q1",
    type: "single",
    prompt: "Si 'alice' ejecuta el archivo, ¿con qué UID efectivo y GID efectivo correrá el proceso?",
    context:
`Permisos del archivo:
-rws--s--- 1 root devops 17536 ago 12 10:12 script_admin

Datos:
- Owner: root
- Group: devops
- Bits: SUID y SGID activos
- 'alice' es parte de 'devops' y tiene ejecución vía ACL`,
    options: [
      { key: "a", label: "UID=alice, GID=devops" },
      { key: "b", label: "UID=root, GID=alice" },
      { key: "c", label: "UID=root, GID=devops" },
      { key: "d", label: "UID=alice, GID=alice" },
    ],
    correct: "c",
    explain:
      "SUID fuerza que el proceso adopte el UID del propietario (root). SGID fuerza el GID efectivo al del grupo propietario (devops). La ACL solo permite ejecutar; los IDs efectivos los determinan SUID/SGID."
  },
  {
    id: "q2",
    type: "single",
    prompt: "Con umask 027, ¿qué permisos tendrán los nuevos 'test.txt' y 'projects/'?",
    context:
`Comandos:
touch test.txt
mkdir projects`,
    options: [
      { key: "a", label: "test.txt: 660; projects/: 770" },
      { key: "b", label: "test.txt: 640; projects/: 750" },
      { key: "c", label: "test.txt: 644; projects/: 755" },
      { key: "d", label: "test.txt: 600; projects/: 700" },
    ],
    correct: "b",
    explain:
      "Base archivos 666 → 666 AND NOT 027 = 640 (rw-r-----). Base dir 777 → 777 AND NOT 027 = 750 (rwxr-x---)."
  },
  {
    id: "q3",
    type: "single",
    prompt: "¿Podrá 'maria' borrar 'shared/informe.txt' en un dir con Sticky Bit?",
    context:
`Directorio:
drwxrwxrwt 5 root developers 4096 ago 12 10:30 shared

Archivo de 'juan':
-rw-r--r-- 1 juan developers 1024 ago 12 10:31 informe.txt

Acción:
rm shared/informe.txt`,
    options: [
      { key: "a", label: "Sí, porque tiene write por grupo en el directorio" },
      { key: "b", label: "No, salvo que sea owner del archivo/directorio o root" },
      { key: "c", label: "Sí, si el archivo tiene permisos 666" },
      { key: "d", label: "Depende de la umask del directorio" },
    ],
    correct: "b",
    explain:
      "El Sticky Bit restringe la eliminación a: propietario del archivo, propietario del directorio, o root; incluso si otros tienen write en el directorio."
  },
  {
    id: "q4",
    type: "single",
    prompt: "Con la ACL mostrada, ¿'ana' puede leer '/data/secret.log'?",
    context:
`Permisos:
-rw-r-----+ 1 root security 2048 ago 12 10:40 /data/secret.log

ACL:
user::rw-
user:ana:rw-
group::r--
mask::rw-
other::---`,
    options: [
      { key: "a", label: "No, porque other no tiene permisos" },
      { key: "b", label: "No, porque el grupo solo tiene r--" },
      { key: "c", label: "Sí, porque entry user:ana:rw- ∧ mask:rw- ⇒ rw-" },
      { key: "d", label: "Sí, pero solo si el archivo es ejecutable" },
    ],
    correct: "c",
    explain:
      "La entrada ACL específica de ana es rw-. La máscara es rw-. Permisos efectivos = entrada ∧ máscara = rw-. Puede leer (cat)."
  },
];

// Render
const list = document.getElementById('questions');
list.innerHTML = QUESTIONS.map((q, idx) => renderQuestion(q, idx+1)).join('');

// Botones
document.getElementById('gradeBtn').addEventListener('click', grade);
document.getElementById('resetBtn').addEventListener('click', resetQuiz);

function renderQuestion(q, n){
  const opts = q.options.map(o => `
    <label class="option">
      <input type="radio" name="${q.id}" value="${o.key}" aria-labelledby="${q.id}-prompt" />
      <span>${o.label}</span>
    </label>
  `).join('');

  const contextBlock = q.context ? `<pre><code>${escapeHtml(q.context)}</code></pre>` : '';
  return `
    <li class="q" id="${q.id}">
      <div class="badge">Pregunta ${n}</div>
      ${contextBlock}
      <p id="${q.id}-prompt" class="prompt">${q.prompt}</p>
      <div class="options">${opts}</div>
      <div class="explain" id="${q.id}-explain" hidden></div>
    </li>
  `;
}

function grade(){
  let correct = 0;
  QUESTIONS.forEach(q => {
    const chosen = getSelected(q.id);
    const box = document.getElementById(`${q.id}-explain`);
    const isRight = chosen === q.correct;
    if(isRight) correct++;
    box.hidden = false;
    box.innerHTML = `<strong>${isRight ? '✅ Correcto' : '❌ Incorrecto'}</strong><br>${escapeHtml(q.explain)}`;
  });

  const score = Math.round((correct / QUESTIONS.length) * 100);
  const result = document.getElementById('result');
  result.classList.remove('good','bad');
  result.classList.add(score >= 75 ? 'good' : 'bad');
  result.innerHTML = `Puntaje: <strong>${score}%</strong> (${correct}/${QUESTIONS.length}) · ${score>=75 ? '¡Bien!' : 'Sigue practicando 💪'}`;
  result.scrollIntoView({behavior:'smooth',block:'center'});
}

function resetQuiz(){
  // Ocultar explicaciones y limpiar resultado
  QUESTIONS.forEach(q => {
    const box = document.getElementById(`${q.id}-explain`);
    box.hidden = true;
    box.textContent = '';
  });
  const result = document.getElementById('result');
  result.textContent = '';
  result.classList.remove('good','bad');
}

function getSelected(id){
  const el = document.querySelector(`input[name="${id}"]:checked`);
  return el ? el.value : null;
}

function escapeHtml(s){
  return s.replace(/[&<>"']/g, c => (
    { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]
  ));
}

const { execSync } = require('child_process');
const path = require('path');

console.log('🧪 Démarrage de la suite de tests...\n');

const testCommands = [
  {
    name: 'Tests unitaires controllers',
    command: 'npm run test:controllers'
  },
  {
    name: 'Tests unitaires services', 
    command: 'npm run test:services'
  },
  {
    name: 'Tests de sécurité',
    command: 'jest tests/security/'
  },
  {
    name: 'Tests critiques',
    command: 'jest tests/critical/'
  },
  {
    name: 'Tests de couverture complète',
    command: 'npm run test:coverage'
  }
];

let totalPassed = 0;
let totalFailed = 0;

testCommands.forEach(({ name, command }, index) => {
  console.log(`\n[${index + 1}/${testCommands.length}] 🏃‍♂️ ${name}`);
  console.log(`Commande: ${command}\n`);
  
  try {
    execSync(command, { stdio: 'inherit', cwd: process.cwd() });
    console.log(`✅ ${name} - RÉUSSI\n`);
    totalPassed++;
  } catch (error) {
    console.error(`❌ ${name} - ÉCHOUÉ\n`);
    totalFailed++;
  }
});

console.log('\n' + '='.repeat(50));
console.log('📊 RÉSUMÉ DES TESTS');
console.log('='.repeat(50));
console.log(`✅ Suites réussies: ${totalPassed}`);
console.log(`❌ Suites échouées: ${totalFailed}`);
console.log(`📈 Taux de réussite: ${((totalPassed / testCommands.length) * 100).toFixed(1)}%`);

if (totalFailed === 0) {
  console.log('\n🎉 Tous les tests sont passés avec succès!');
  process.exit(0);
} else {
  console.log('\n⚠️  Certains tests ont échoué. Vérifiez les logs ci-dessus.');
  process.exit(1);
}
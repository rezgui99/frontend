#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

console.log('🧪 Démarrage de la suite complète de tests...\n');

const testSuites = [
  {
    name: 'Tests de sécurité',
    command: 'npm run test:security',
    critical: true
  },
  {
    name: 'Tests unitaires - Contrôleurs',
    command: 'npm run test:controllers',
    critical: true
  },
  {
    name: 'Tests unitaires - Services',
    command: 'npm run test:services',
    critical: true
  },
  {
    name: 'Tests unitaires - Middleware',
    command: 'npm run test:middleware',
    critical: true
  },
  {
    name: 'Tests d\'intégration',
    command: 'npm run test:integration',
    critical: false
  },
  {
    name: 'Tests de performance',
    command: 'npm run test:performance',
    critical: false
  },
  {
    name: 'Couverture de code complète',
    command: 'npm run test:coverage',
    critical: false
  }
];

let totalPassed = 0;
let totalFailed = 0;
let criticalFailed = 0;

console.log('📋 Suites de tests à exécuter:');
testSuites.forEach((suite, index) => {
  const criticalMark = suite.critical ? '🔴' : '🟡';
  console.log(`  ${index + 1}. ${criticalMark} ${suite.name}`);
});
console.log('\n🔴 = Critique  🟡 = Optionnel\n');

testSuites.forEach(({ name, command, critical }, index) => {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`[${index + 1}/${testSuites.length}] 🏃‍♂️ ${name}`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Commande: ${command}\n`);
  
  try {
    execSync(command, { 
      stdio: 'inherit', 
      cwd: process.cwd(),
      timeout: 120000 // 2 minutes timeout
    });
    
    console.log(`\n✅ ${name} - RÉUSSI`);
    totalPassed++;
  } catch (error) {
    console.error(`\n❌ ${name} - ÉCHOUÉ`);
    console.error(`Code de sortie: ${error.status}`);
    totalFailed++;
    
    if (critical) {
      criticalFailed++;
    }
  }
});

// Résumé final
console.log('\n' + '='.repeat(80));
console.log('📊 RÉSUMÉ FINAL DES TESTS');
console.log('='.repeat(80));
console.log(`✅ Suites réussies: ${totalPassed}`);
console.log(`❌ Suites échouées: ${totalFailed}`);
console.log(`🔴 Tests critiques échoués: ${criticalFailed}`);
console.log(`📈 Taux de réussite global: ${((totalPassed / testSuites.length) * 100).toFixed(1)}%`);

if (criticalFailed > 0) {
  console.log('\n🚨 ATTENTION: Des tests critiques ont échoué!');
  console.log('Les tests critiques doivent passer avant le déploiement.');
  process.exit(1);
} else if (totalFailed === 0) {
  console.log('\n🎉 Tous les tests sont passés avec succès!');
  console.log('✅ Le code est prêt pour le déploiement.');
  process.exit(0);
} else {
  console.log('\n⚠️  Certains tests optionnels ont échoué.');
  console.log('Les tests critiques sont passés, mais vérifiez les échecs ci-dessus.');
  process.exit(0);
}
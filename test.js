const fs = require('fs');
const path = require('path');

const sourcePath = './docker-compose.yml';  // Chemin relatif vers docker-compose.yml
const destinationDir = '/aled';  // Répertoire de destination absolu

try {
  // Vérifier si le répertoire de destination existe
  if (!fs.existsSync(destinationDir)) {
    console.log(`Le répertoire ${destinationDir} n'existe pas.`);
  } else {
    // Copier le fichier docker-compose.yml vers le répertoire de destination
    fs.copyFileSync(sourcePath, path.join(destinationDir, 'docker-compose.yml'));
    console.log('Fichier copié avec succès vers', path.join(destinationDir, 'docker-compose.yml'));
  }
} catch (err) {
  console.error('Erreur lors de la copie du fichier :', err);
}

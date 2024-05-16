import fs from 'node:fs';
import { Request, Response } from 'express';
import path from 'path'

export default class DockerService {

  public async generateDocker(request: Request) {
    const { foldername, mysql_root_psswd, mysql_user, mysql_psswd } = request.body;
    console.log(request.body);
    
    const folderPath = path.join(__dirname, '..', '..', '..', `/wp-sites/${foldername}`)
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath);
      const replacements = {
        '_{MYSQL_ROOT_PASSWORD}': mysql_root_psswd,
        '_{MYSQL_USER}': mysql_user,
        '_{MYSQL_PASSWORD}': mysql_psswd
      };

      fs.readFile(`src/docker-compose.yml`, 'utf8', (err, data) => {
        if (err) {
          throw 'Erreur de lecture du fichier:' + err;

        }

        //   // Remplacer les mots
        let modifiedData = data;
        for (const [oldWord, newWord] of Object.entries(replacements)) {
          const regex = new RegExp(oldWord, 'g');
          modifiedData = modifiedData.replace(regex, newWord);
        }

        // Écrire le fichier modifié
        fs.writeFile(`${folderPath}/docker-compose.yml`, modifiedData, 'utf8', (err) => {
          if (err) {
            // console.error('Erreur d\'écriture dans le fichier:', err);
            throw 'Erreur d\'écriture dans le fichier: \n' + err;
          }
          return 'Le fichier a été modifié avec succès!';
        });
      });

    }else {
      throw new Error("Folder already exist");
    }

  }

  // public getAllFolders() TODO
}
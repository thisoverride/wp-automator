import fs from 'node:fs';
import Dockerode from 'dockerode';
import { Request, Response } from 'express'; 
import path from 'path';
import yaml from 'js-yaml';
import DockerServiceException from '../core/exception/DockerServiceException';

export default class DockerService {

public  async generateDocker(request:Request){
  const {foldername,mysql_root_psswd,mysql_db,mysql_user,mysql_psswd} = request.body;
  const folderPath = path.join(__dirname,'..','..','..',`/wp-sites/${foldername}`)
  if(!fs.existsSync(folderPath)){
    fs.mkdirSync(folderPath);
    const replacements = {
      '%example_root_password%': mysql_root_psswd,
      '%wordpress%': mysql_db,
      '%wordpress_user%':mysql_user,
      '%example_password%':mysql_psswd
    };
    
    fs.readFile(`src/docker-compose.yml`, 'utf8',(err, data) => {
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

  }
  
}

// public getAllFolders() TODO

public async build(request: Request) {
  const { appName } = request.query;

  if (!appName) {
    throw new Error('Le paramètre est vide : appName');
  }
  const folderPath: string = path.join(__dirname, '..', '..', '..', `/wp-sites/${appName}`);

    if (!fs.existsSync(folderPath)) {
      throw new DockerServiceException('Ce projet n\'existe pas', 500);
    }
    const dockerComposePath: string = path.join(folderPath, 'docker-compose.yml');

    if (!fs.existsSync(dockerComposePath)) {
      throw new DockerServiceException('Ce projet ne contient pas de modèle de configuration Docker (docker-compose.yml)', 500);
    }

    const docker: Dockerode = new Dockerode();
    const dockerComposeYml: string = fs.readFileSync(dockerComposePath, 'utf8');
    const composeConfig: string = yaml.load(dockerComposeYml) as string;
  

    docker.run(composeConfig, [], process.stdout).then(function(container) {
      console.log(container.output.StatusCode);
      return container.remove();
    }).then(function(data) {
      console.log('container removed');
    }).catch(function(err) {
      console.log(err);
    });


    return { message: `Conteneur ID`, status: 200 };
  }
}
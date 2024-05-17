import fs from 'node:fs';
import { Request, Response } from 'express';
import path from 'path'
import { promisify } from 'util';
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

export default class DockerService {

  public async generateDocker(request: Request) {
    const { foldername, mysql_root_psswd, mysql_user, mysql_psswd } = request.body;
    console.log(request.body);

    const folderPath = path.join(__dirname, '..', '..', '..', `/wp-sites/${foldername}`)
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath);
      const replacements = {
        '%{MYSQL_ROOT_PASSWORD}': mysql_root_psswd,
        '%{MYSQL_USER}': mysql_user,
        '%{MYSQL_PASSWORD}': mysql_psswd
      };

      try {
        let data = await readFile(`src/docker-compose.yml`, 'utf8');

        // Replace words
        let modifiedData = data;
        for (const [oldWord, newWord] of Object.entries(replacements)) {

          const regex = new RegExp(oldWord, 'g');
          modifiedData = modifiedData.replace(regex, newWord);
        }

        if (mysql_root_psswd.length < 8 || mysql_psswd.length < 8) {
          throw new Error("Password should have at least 8 characters from both MySQL root and user");
        }

        if (mysql_user.length < 4) {
          throw new Error("MySQL username should have at least 4 characters");
        }
        // Write the modified file
        await writeFile(`${folderPath}/docker-compose.yml`, modifiedData, 'utf8');

        return 'The file has been successfully generated!';
      } catch (err) {
        throw new Error('Error reading or writing the file: ' + err);
      }

    } else {
      throw new Error("The folder already exist");
    }

  }

  // public getAllFolders() TODO
}
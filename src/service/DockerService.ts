import fs from 'node:fs';
import { Request, Response } from 'express';
import path from 'path'
import { promisify } from 'util';
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
import Dockerode, { ContainerInfo, ContainerInspectInfo, ImageInfo } from 'dockerode';
import DockerodeCompose from 'dockerode-compose';
import DockerServiceException from '../core/exception/DockerServiceException';
import { HttpResponse } from '../controller/ControllerInterface';
import HttpStatusCodes from '../utils/HttpStatusCode';

export default class DockerService {
  private readonly _docker: Dockerode;
  private readonly WP_SITES_DIR_PATH: string = path.join(__dirname, '..', '..', '..', '/wp-sites/');

  public constructor(dockernode: Dockerode) {
    this._docker = dockernode;
  }

  public async generateDocker(request: Request) {
    const { foldername, mysql_root_psswd, mysql_user, mysql_psswd } = request.body;
    // console.log(request.body);

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

public async build(appName: string): Promise<HttpResponse> {
  try {
    if (!appName) throw new DockerServiceException ('Le paramètre est vide : appName', HttpStatusCodes.BAD_REQUEST);
    const folderPath: string = path.join(this.WP_SITES_DIR_PATH , appName);
    
    if (!fs.existsSync(folderPath)) throw new DockerServiceException('Ce projet n\'existe pas', HttpStatusCodes.NOT_FOUND);
    const dockerComposePath: string = path.join(folderPath, 'docker-compose.yml');
  
    if (!fs.existsSync(dockerComposePath)) throw new DockerServiceException
      (`Ce projet ne contient pas de modèle de configuration Docker (docker-compose.yml)`, 
      HttpStatusCodes.NOT_FOUND);
      const compose = new DockerodeCompose(this._docker,dockerComposePath, appName.toString());
      const containerInfo = await compose.up();
      
    return { message: containerInfo.volumes[0].Status , status: HttpStatusCodes.OK };
  } catch (error) {
    return this.handleError(error);
  }
}


  public async getContainersInfos(): Promise<HttpResponse>  {
    try {
      const containerInfo: ContainerInfo[] = await this._docker.listContainers();
      return { message: containerInfo, status: 200 };
    } catch (error) {
      return this.handleError(error);
    }
  }

  public async getImagesInfos(): Promise<HttpResponse> {
    try {
      const imagesInfo: ImageInfo[] = await this._docker.listImages();
      return { message: imagesInfo, status: 200 };
    } catch (error) {
      return this.handleError(error);
    }
  }


  public async startDockerCompose(appName: string): Promise<HttpResponse> {
    try {
      const dockerComposePath: string = path.join(this.WP_SITES_DIR_PATH , appName, 'docker-compose.yml');
      const compose = new DockerodeCompose(this._docker,dockerComposePath, appName.toString());
      await compose.up();

      return { message: `Docker Compose for ${appName} started successfully.`, status: HttpStatusCodes.OK };
    } catch (error: any) {
      return this.handleError(error);
    }
  }
  public async stopDockerCompose(appName: string): Promise<HttpResponse> {
    try {
      const dockerComposePath: string = path.join(this.WP_SITES_DIR_PATH , appName, 'docker-compose.yml');
      const compose = new DockerodeCompose(this._docker,dockerComposePath, appName.toString());
      await compose.down();

      return { message: `Docker Compose for ${appName} stopped successfully.`, status: HttpStatusCodes.OK };
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  public async runContainer(containerId: string): Promise<HttpResponse> {
    try {
      const container = this._docker.getContainer(containerId.toString());
      const containerInfo: ContainerInspectInfo = await container.inspect();
      
      if (containerInfo.State.Running) throw new DockerServiceException
      ('Container already started', HttpStatusCodes.BAD_REQUEST);
      await container.start();
      
      return { message: `Container ${containerId} begin started successfully.`, status: HttpStatusCodes.OK };
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  public async stopContainer(containerId: string): Promise<HttpResponse> {
    try {
      const container = this._docker.getContainer(containerId);
      const containerInfo: ContainerInspectInfo = await container.inspect();

      if (!containerInfo.State.Running) throw new DockerServiceException
      ('Container is not running', HttpStatusCodes.BAD_REQUEST);
      await container.stop();

      return { message: `Container ${containerId} stopped successfully.`, status: HttpStatusCodes.OK };
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  public async destroyContainer(containerId: string): Promise<HttpResponse> {
    try {
      const container = this._docker.getContainer(containerId);
      await container.remove();
      return { message: `Container ${containerId} is removed successfully.`, status: HttpStatusCodes.OK };
    } catch (error: any) {
      return this.handleError(error);
    }
  }

  private handleError(error: any): HttpResponse {
    console.log(error)
    if (error instanceof DockerServiceException) {
      return { message: error.message, status: error.status };
    } else {
      return { message: 'Internal Server Error', status: 500 };
    }
  }
}


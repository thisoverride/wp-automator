import fs from 'node:fs';
import path from 'path'
import { HttpStatusCodes , DirManager } from '../utils/Utils'
import Dockerode, { ContainerInfo, ContainerInspectInfo, ImageInfo } from 'dockerode';
import { v2 as compose } from 'docker-compose'
import DockerServiceException from '../core/exception/DockerServiceException';
import { HttpResponse } from '../controller/ControllerInterface';
import { requestBodySchema } from '../utils/schema'
import { spawn } from 'node:child_process';
import type { GenerateRequestBody } from '../@type/global';

export default class DockerService {
  private readonly _docker: Dockerode;
  private static readonly WP_SITES_DIR_PATH: string = path.join(__dirname, '..', '..', '..', '/wp-sites/');

  public constructor(dockernode: Dockerode) {
    this._docker = dockernode;
  }

  public async buildTemplate(requestBody: GenerateRequestBody): Promise<HttpResponse> {
    try {
      const { error, value } = requestBodySchema.validate(requestBody);
      if (error) {
        throw new DockerServiceException(
          `${error.message}`, HttpStatusCodes.BAD_REQUEST);
      }
      const availablePort = await this.executePythonScript() as any;

      if (!availablePort.ports.includes(parseInt(requestBody.wpPort.toString()))) {
        throw new DockerServiceException
        (`Le port ${requestBody.wpPort} est n'est pas disponible`,HttpStatusCodes.BAD_REQUEST);
      }
      if (!availablePort.ports.includes(parseInt(requestBody.mysqlPort.toString()))) {
        throw new DockerServiceException
        (`Le port ${requestBody.mysqlPort} est n'est pas disponible`, HttpStatusCodes.BAD_REQUEST);
      }
      

    
      const folderPath: string = path.join(DockerService.WP_SITES_DIR_PATH, requestBody.dirname);
      if (await DirManager.folderExists(folderPath)) {
        throw new DockerServiceException(
          `Le projet "${requestBody.dirname}" ne peut pas être créé car il existe déjà.`,
          HttpStatusCodes.BAD_REQUEST
        );
      }
      
      let templatePath: string = path.join(__dirname, '..','..','.bin','.platform','docker-compose.yml');
      const templateFile = await DirManager.readfile(templatePath);

      if(!templateFile){
        throw new DockerServiceException
        (`Impossible de localiser la source ${templatePath}`,HttpStatusCodes.NOT_FOUND);
      }

      const replacements = {
        '%{INSTANCE_NUMBER}': '8765764reg',
        '%{MYSQL_ROOT_PASSWORD}': requestBody.mysqlRootPassword.toString(),
        '%{MYSQL_USER}': requestBody.mysqlUser.toString(),
        '%{MYSQL_PASSWORD}': requestBody.wpPassword.toString(),
        '%{DB_PORT}': requestBody.mysqlPort.toString(),
        '%{WORDPRESS_PORT}': requestBody.wpPort.toString()
      };
      
      const generatedTemplate: string = DirManager.replaceTemplateFlags(templateFile,replacements);
      if(await DirManager.createDir(folderPath)){
        if(!await DirManager.writeFile(folderPath + '/docker-compose.yml', generatedTemplate)){
          await DirManager.deleteDir(folderPath);
          throw new DockerServiceException('Erreur lors de l\'écriture du fichier',HttpStatusCodes.INTERNAL_SERVER_ERROR);
        }
      }else {
        throw new DockerServiceException('Erreur lors de creation du dossier',HttpStatusCodes.INTERNAL_SERVER_ERROR);
      }
      return { message: 'Le template a été généré avec succès.' , status: HttpStatusCodes.OK }
    } catch (error) {
      return this.handleError(error);
    }    
  }
  
  public async build(appName: string): Promise<HttpResponse> {
    try {
      if (!appName) throw new DockerServiceException ('Le paramètre est vide : appName', HttpStatusCodes.BAD_REQUEST);
      const folderPath: string = path.join(DockerService.WP_SITES_DIR_PATH , appName);
    
      if (!fs.existsSync(folderPath)) throw new DockerServiceException('Ce projet n\'existe pas', HttpStatusCodes.NOT_FOUND);
      const dockerComposePath: string = path.join(folderPath, 'docker-compose.yml');
  
      if (!fs.existsSync(dockerComposePath)){
        throw new DockerServiceException
        (`Ce projet ne contient pas de modèle de configuration Docker (docker-compose.yml)`, 
        HttpStatusCodes.NOT_FOUND);
      } 

      compose.pullAll({ cwd: folderPath, log: true }).then(()=>{
        console.log('Pulling finish')
        compose.upAll({ cwd: folderPath, log: true }).then(()=>{
          console.log('Application is running')
        }).catch((e)=> {
          console.log(e)
        })
      }).catch((e)=> {
        console.log('wrs')
      })

    return { message: 'Lancement de la machine de build' , status: HttpStatusCodes.OK };
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
      const folderPath: string = path.join(DockerService.WP_SITES_DIR_PATH, appName);
      await compose.upAll({ cwd: folderPath, log: true })

      return { message: `Docker Compose for ${appName} started successfully.`, status: HttpStatusCodes.OK };
    } catch (error: any) {
      return this.handleError(error);
    }
  }


  public async stopDockerCompose(appName: string): Promise<HttpResponse> {
    try {
      const folderPath: string = path.join(DockerService.WP_SITES_DIR_PATH , appName);
      if (!fs.existsSync(folderPath)) throw new DockerServiceException
      (`Le conteneur ${appName} n'existe pas.`, HttpStatusCodes.NOT_FOUND);

      await compose.downAll({ cwd: folderPath, log: true });
      
      return { message: `Docker Compose for ${appName} stopped successfully.`, status: HttpStatusCodes.OK };
    } catch (error: any) {
      return this.handleError(error);
    }
  }


  public async runContainer(containerId: string): Promise<HttpResponse> {
    try {
      const container = this._docker.getContainer(containerId.toString());
      const containerInfo: ContainerInspectInfo = await container.inspect();
      
      if (containerInfo.State.Running){
        throw new DockerServiceException
        ('Container already started', HttpStatusCodes.BAD_REQUEST);
      }
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

  private async executePythonScript() {
    return new Promise((resolve, reject) => {
      const pythonProcess = spawn('python3', [path.join(__dirname, '..','..','.bin', 'check_all_available_ports.py')]);
  
      let stdoutData = '';
      let stderrData = '';
  
      pythonProcess.stdout.on('data', (data) => {
        stdoutData += data;
      });
  
      pythonProcess.stderr.on('data', (data) => {
        stderrData += data;
      });
  
      pythonProcess.on('close', (code) => {
        if (code === 0) {
          if (stdoutData !== null && stdoutData !== undefined) {
            const portRegex = /\d+/g;
            const matchResult = stdoutData.match(portRegex);
  
            if (matchResult !== null) {
              const portsArray = matchResult.map(Number);
              resolve({ ports: portsArray, stderr: stderrData });
            } else {
              reject('No ports found in the output');
            }
          } else {
            reject('No output received from the Python script');
          }
        } else {
          reject(`Python script execution failed with code ${code}`);
        }
      });
  
      pythonProcess.on('error', (err) => {
        reject(`Failed to execute Python script: ${err}`);
      });
    });
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


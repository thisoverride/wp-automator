import fs from 'node:fs';
import path from 'path'
import Dockerode, { ContainerInfo, Volume, VolumeInspectInfo } from 'dockerode';
import { HttpStatusCodes, DirManager, Tools } from '../utils/Utils'
import DockerServiceException from '../core/exception/DockerServiceException';
import { HttpResponse } from '../controller/ControllerInterface';
import type { GenerateRequestBody } from '../@type/global';
import sha256 from 'crypto-js/sha256';
import WordpressSitesRepository from '../repository/dao/WordpressSitesRepository';
import WordpressSites from '../repository/models/WordpressSites.model';
import UserRepository from '../repository/dao/UserRepository';
import ApiKeyRepository from '../repository/dao/ApiKeyRepository';
import ApiKeyService from './ApiKeyService';
import DockerManager from '../manager/DockerManager';
import { ValidateBody } from '../core/decorator/Validator';
import ExternalServiceManager from '../manager/ExternalServiceManager'



export default class DockerService {
    private readonly _docker: Dockerode;
    private readonly _wordpressSitesRepository: WordpressSitesRepository;
    private readonly _userRepository: UserRepository;
    private readonly _apiKeyRepository: ApiKeyRepository;
    private readonly _apiKeyService: ApiKeyService;
    private readonly _dockerManager: DockerManager;
    public static readonly WP_SITES_DIR_PATH: string = path.join(__dirname, '..', '..', '..', '/wp-sites/');

    public constructor(
        dockernode: Dockerode, 
        wordpressSitesRepository: WordpressSitesRepository,
        userRepository : UserRepository,
        apiKeyRepository : ApiKeyRepository, 
        ApiKeyService: ApiKeyService
    ) {
        this._docker = dockernode;
        this._wordpressSitesRepository = wordpressSitesRepository;
        this._userRepository = userRepository;
        this._apiKeyRepository = apiKeyRepository;
        this._apiKeyService = ApiKeyService
        this._dockerManager = new DockerManager(dockernode);
    }

    @ValidateBody
    public async buildTemplate(requestBody: GenerateRequestBody): Promise<HttpResponse> {
        try {
            const folderPath: string = path.join(DockerService.WP_SITES_DIR_PATH, requestBody.dirname);
            let dockerTemplatePath: string = path.join(__dirname, '..', '..', '.bin', '.platform', 'docker-compose.yml');
            const DockerTemplateFile = await DirManager.readfile(dockerTemplatePath);

            let wpcliTamplatePath: string = path.join(__dirname, '..', '..', '.bin', 'wpcli_setup.sh');
            const wpcliTemplateFile = await DirManager.readfile(wpcliTamplatePath);

            if (!DockerTemplateFile) {
                throw new DockerServiceException(`Impossible de localiser la source ${dockerTemplatePath}`, 
                    HttpStatusCodes.NOT_FOUND);
            }
            if (!wpcliTemplateFile) {
                throw new DockerServiceException(`Impossible de localiser la source ${wpcliTamplatePath}`,
                    HttpStatusCodes.NOT_FOUND);
            }

            const dockerEnvironmentVars = {
                '%{MYSQL_ROOT_PASSWORD}': requestBody.mysqlRootPassword.toString(),
                '%{MYSQL_USER}': requestBody.mysqlUser.toString(),
                '%{MYSQL_PASSWORD}': requestBody.wpPassword.toString(),
                '%{DB_PORT}': requestBody.mysqlPort.toString(),
                '%{WP_PORT}': requestBody.wpPort.toString(),
                '%{PROJECT_NAME}': requestBody.dirname.toString(),
            };

            const wpcliEnvironmentVars = {
                '%{MYSQL_ROOT_PASSWORD}': requestBody.mysqlRootPassword.toString(),
                '%{WP_LANGUAGE}': requestBody.language.toString(),
                '%{WP_HOST}': requestBody.wpHost.toString(),
                '%{WP_PORT}': requestBody.wpPort.toString(),
                '%{WP_PROJECT_NAME}': requestBody.wpProjectName.toString(),
                '%{WP_USER}': requestBody.username.toString(),
                '%{WP_PASSWORD}': requestBody.wpPassword.toString(),
                '%{WP_EMAIL}': requestBody.email.toString(),
                '%{SECRET_KEY}': sha256(Tools.generateRandomString(20)).toString(),
            };

            const dockerizedTemplate: string = DirManager.replaceTemplateFlags(DockerTemplateFile, dockerEnvironmentVars);
            let wpcliTemplate: string = DirManager.replaceTemplateFlags(wpcliTemplateFile, wpcliEnvironmentVars);

            if (await DirManager.createDir(folderPath)) {
                if (!await DirManager.writeFile(folderPath + '/docker-compose.yml', dockerizedTemplate)) {
                    await DirManager.deleteDir(folderPath);
                    throw new DockerServiceException('Erreur lors de l\'écriture du fichier', HttpStatusCodes.INTERNAL_SERVER_ERROR);
                }
                
                let addonScript: string = '';
                for (const addonItem of requestBody.addons) {
                    addonScript += `${addonItem.slug} `
                }
                wpcliTemplate = wpcliTemplate.replace('%{ADDONS}', addonScript);

                if (!await DirManager.writeFile(folderPath + '/wpcli_setup.sh', wpcliTemplate)) {
                    await DirManager.deleteDir(folderPath);
                    throw new DockerServiceException('Erreur lors de l\'écriture du fichier', HttpStatusCodes.INTERNAL_SERVER_ERROR);
                }
     
               const app =  await this._wordpressSitesRepository.create({
                    app_name: requestBody.wpProjectName,
                    url: `${requestBody.wpHost}:${requestBody.wpPort}` ,
                    status: 'created' 
                });
                await this._userRepository.create({
                    username : requestBody.username,
                    email : requestBody.email,
                    password: requestBody.wpPassword,
                    type: 'none',
                    wordpress_site_id : app.dataValues.id as any
                });
            } else {
                throw new DockerServiceException('Erreur lors de creation du dossier', HttpStatusCodes.INTERNAL_SERVER_ERROR);
            }
            return { message: 'Le template a été généré avec succès.', status: HttpStatusCodes.OK }
        } catch (error) {
            return this.handleError(error);
        }
    }

    public async build(appName: string): Promise<HttpResponse> {
        try {
            if (!appName) throw new DockerServiceException('Le paramètre est vide : appName', HttpStatusCodes.BAD_REQUEST);
            const folderPath: string = path.join(DockerService.WP_SITES_DIR_PATH, appName);

            if (!fs.existsSync(folderPath)) throw new DockerServiceException('Ce projet n\'existe pas', HttpStatusCodes.NOT_FOUND);
            const dockerComposePath: string = path.join(folderPath, 'docker-compose.yml');

            if (!fs.existsSync(dockerComposePath)) {
                throw new DockerServiceException(`Ce projet ne contient pas de modèle de configuration Docker (docker-compose.yml)`,
                    HttpStatusCodes.NOT_FOUND);
            }
            this.runBuildProcess(folderPath,appName);

            return { message: 'Lancement de la machine de build', status: HttpStatusCodes.OK };
        } catch (error) {
            return this.handleError(error);
        }
    }

    private async runBuildProcess(folderPath: string, appName: string): Promise<void> {
        let applicationWp: WordpressSites | null = null;
        try {
            applicationWp = await this._wordpressSitesRepository.findByName(appName);
    
            if (!applicationWp) {
                throw new Error(`WordpressSite with name ${appName} not found.`);
            }
    
            await this._wordpressSitesRepository.updateStatus(applicationWp.id, 'pulling')
            await this._dockerManager.composePull(folderPath);
           
            await this._wordpressSitesRepository.updateStatus(applicationWp.id, 'mount');
            await this._dockerManager.composeUp(folderPath);
            
            await this._wordpressSitesRepository.updateStatus(applicationWp.id, 'instalation');
            await this.executeBashScript(folderPath, applicationWp.id);

        } catch (error) {
            console.error('Error in build process:', error);
            if (applicationWp && applicationWp.id) {
                applicationWp.status = 'failed'
                await this._wordpressSitesRepository.updateStatus(applicationWp.id, 'failed')
            } 
        }
    }

    public async getContainersInfos(): Promise<HttpResponse> {
        try {
            const containerInfo = await this._dockerManager.getContainersInfos();
            return { message: containerInfo, status: HttpStatusCodes.OK };
        } catch (error) {
            return this.handleError(error);
        }
    }

    public async getImagesInfos(): Promise<HttpResponse> {
        try {
            const imagesInfo = await this._dockerManager.getImagesInfos();
            return { message: imagesInfo, status: HttpStatusCodes.OK };
        } catch (error) {
            return this.handleError(error);
        }
    }

    public async destroyContainer(containerId: string): Promise<HttpResponse> {
        try {
            await this._dockerManager.removeContainer(containerId);
            return { message: `Container ${containerId} is removed successfully.`, status: HttpStatusCodes.OK };
        } catch (error: any) {
            return this.handleError(error);
        }
    }

    public async startDockerCompose(appName: string): Promise<HttpResponse> {
        try {
            const folderPath: string = path.join(DockerService.WP_SITES_DIR_PATH, appName);
            await this._dockerManager.composeUp(folderPath)
            return { message: `Docker Compose for ${appName} started successfully.`, status: HttpStatusCodes.OK };
        } catch (error: any) {
            return this.handleError(error);
        }
    }

    public async removeContainersAndVolumes(appName: string, delete_project: Boolean): Promise<HttpResponse> {
        try {
            const folderPath: string = path.join(DockerService.WP_SITES_DIR_PATH, appName);
            let message = '';
            if (!fs.existsSync(folderPath)) {
                throw new DockerServiceException(`Le projet ${appName} n'existe pas.`,HttpStatusCodes.NOT_FOUND);
            }
          
            const composeConfig: string = path.join(folderPath, 'docker-compose.yml');
            if (!fs.existsSync(composeConfig)) {
                throw new DockerServiceException(`Fichier docker-compose.yml introuvable pour le projet ${appName}.`,
                    HttpStatusCodes.NOT_FOUND
                );
            }

            await this._dockerManager.composeDown(folderPath)
            const containers: ContainerInfo[] = await this._dockerManager.getContainersInfos(); 
            const projectContainers: ContainerInfo[] = containers.filter(container =>

                container.Labels['com.docker.compose.project'] === appName
            );

            for (const containerInfo of projectContainers) {
                const container = this._docker.getContainer(containerInfo.Id);
                await container.remove({ force: true });
            }

            const volumes = await this._docker.listVolumes();
            const projectVolumes: VolumeInspectInfo[] = volumes.Volumes.filter(volume =>
                volume.Labels && volume.Labels['com.docker.compose.project'] === appName
            );

            for (const volumeInfo of projectVolumes) {
                const volume: Volume = this._docker.getVolume(volumeInfo.Name);
                await volume.remove();
            }
            message = `Tous les conteneurs et volumes associés à ${appName} ont été supprimés avec succès.`;

            if (delete_project) {
                if (await DirManager.folderExists(folderPath)) {
             
                    if (await DirManager.deleteDir(folderPath)) {
                        message += `Le repertoire du projet ${appName} a été supprimé correctement.`
                    } else {
                        throw new DockerServiceException('Erreur lors de la suppression du projet', HttpStatusCodes.INTERNAL_SERVER_ERROR);
                    }
       
                } else {
                    throw new DockerServiceException(`Le répertoire ${folderPath} n'existe pas`, HttpStatusCodes.NOT_FOUND);
                }
            }

            return { message: message, status: HttpStatusCodes.OK };
        } catch (error: any) {
            return this.handleError(error);
        }
    }


    public async stopDockerCompose(appName: string): Promise<HttpResponse> {
        try {
            const folderPath: string = path.join(DockerService.WP_SITES_DIR_PATH, appName);
            if (!fs.existsSync(folderPath)) throw new DockerServiceException
                (`Le conteneur ${appName} n'existe pas.`, HttpStatusCodes.NOT_FOUND);
                await this._dockerManager.composeDown(folderPath);
            
            return { message: `Docker Compose for ${appName} stopped successfully.`, status: HttpStatusCodes.OK };
        } catch (error: any) {
            return this.handleError(error);
        }
    }


    public async runContainer(containerId: string): Promise<HttpResponse> {
        try {
            const status: boolean = await this._dockerManager.runContainer(containerId.toString());
            if (status) {
                throw new DockerServiceException('Container already started', HttpStatusCodes.BAD_REQUEST);
            }
            return { message: `Container ${containerId} begin started successfully.`, status: HttpStatusCodes.OK };
        } catch (error: any) {
            return this.handleError(error);
        }
    }

    public async stopContainer(containerId: string): Promise<HttpResponse> {
        try {
            const status: boolean = await this._dockerManager.stopContainer(containerId.toString());
            if (!status) {
                throw new DockerServiceException('Container is not running', HttpStatusCodes.BAD_REQUEST);
            } 
            return { message: `Container ${containerId} stopped successfully.`, status: HttpStatusCodes.OK };
        } catch (error: any) {
            return this.handleError(error);
        }
    }



    private async executeBashScript(folderPath: string,id: number) : Promise<void> {
        const scriptPath = `${folderPath}/wpcli_setup.sh`;

        if (!DirManager.folderExists(scriptPath)) {
            const errorMessage = `Script not found: ${scriptPath}`;
            console.error(errorMessage);
            throw new DockerServiceException(errorMessage, HttpStatusCodes.NOT_FOUND);
        }
        if (!DirManager.verifyFilePermission(folderPath, 755)) {
            try {
                fs.chmodSync(scriptPath, '755');
            } catch (chmodError) {
                console.error('Failed to set script as executable:', chmodError);
                throw new DockerServiceException('Failed to set script as executable : \n' + chmodError, 
                    HttpStatusCodes.INTERNAL_SERVER_ERROR);
            }
        }

         await ExternalServiceManager.executeScript('sh',scriptPath,[],true,folderPath);
         await this._wordpressSitesRepository.updateStatus(id, 'completed')
         const app = await this._wordpressSitesRepository.findById(id)
         
         if(app){
            const user = await this._userRepository.findByAppId(app.dataValues.id as any)
            console.log(user?.dataValues)
            const {consumer_key , secret_key } = await this._apiKeyService.generateApiKey(app.dataValues.url, 
                         {wpUsr : user!.username, wpPsswd: user!.password})
            await this._apiKeyRepository.create({ consumer_key: consumer_key, consumer_secret: secret_key})
         };
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

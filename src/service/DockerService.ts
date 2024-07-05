import fs from 'node:fs';
import path from 'path'
import { HttpStatusCodes, DirManager, Tools } from '../utils/Utils'
import Dockerode, { ContainerInfo, ContainerInspectInfo, ContainerListOptions, ImageInfo } from 'dockerode';
import { v2 as compose } from 'docker-compose'
import DockerServiceException from '../core/exception/DockerServiceException';
import { HttpResponse } from '../controller/ControllerInterface';
import { requestBodySchema } from '../framework/validator/schema'
import { spawn } from 'node:child_process';
import type { GenerateRequestBody } from '../@type/global';
import sha256 from 'crypto-js/sha256';


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
                    `${error.stack}`, HttpStatusCodes.BAD_REQUEST);
            }
            const availablePort = await this.executePythonScript() as any;

            if (!availablePort.ports.includes(parseInt(requestBody.wpPort.toString()))) {
                throw new DockerServiceException
                    (`Le port ${requestBody.wpPort} est n'est pas disponible`, HttpStatusCodes.BAD_REQUEST);
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

            let dockerTemplatePath: string = path.join(__dirname, '..', '..', '.bin', '.platform', 'docker-compose.yml');
            const DockerTemplateFile = await DirManager.readfile(dockerTemplatePath);

            let wpcliTamplatePath: string = path.join(__dirname, '..', '..', '.bin', 'wpcli_setup.sh');
            const wpcliTemplateFile = await DirManager.readfile(wpcliTamplatePath);

            if (!DockerTemplateFile) {
                throw new DockerServiceException
                    (`Impossible de localiser la source ${dockerTemplatePath}`, HttpStatusCodes.NOT_FOUND);
            }

            if (!wpcliTemplateFile) {
                throw new DockerServiceException
                    (`Impossible de localiser la source ${wpcliTamplatePath}`, HttpStatusCodes.NOT_FOUND);
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

                let addonScript = '';
                for (const addonItem of requestBody.addons) {
                    addonScript += `${addonItem.slug} `
                }
                wpcliTemplate = wpcliTemplate.replace('%{ADDONS}', addonScript);

                if (!await DirManager.writeFile(folderPath + '/wpcli_setup.sh', wpcliTemplate)) {
                    await DirManager.deleteDir(folderPath);
                    throw new DockerServiceException('Erreur lors de l\'écriture du fichier', HttpStatusCodes.INTERNAL_SERVER_ERROR);
                }

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
                throw new DockerServiceException
                    (`Ce projet ne contient pas de modèle de configuration Docker (docker-compose.yml)`,
                        HttpStatusCodes.NOT_FOUND);
            }

            await compose.pullAll({ cwd: folderPath, log: true });
            console.log('Pulling finish');

            await compose.upAll({ cwd: folderPath, log: true });
            console.log('Application is running');

            await this.executeBashScript(folderPath);

            return { message: 'Lancement de la machine de build', status: HttpStatusCodes.OK };
        } catch (error) {
            return this.handleError(error);
        }
    }

    public async getContainersInfos(): Promise<HttpResponse> {
        try {
            const containerInfo: ContainerInfo[] = await this._docker.listContainers({ all: true });
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

    public async removeContainersAndVolumes(appName: string, delete_project: Boolean): Promise<HttpResponse> {
        try {
            const folderPath: string = path.join(DockerService.WP_SITES_DIR_PATH, appName);
            let message = '';
            if (!fs.existsSync(folderPath)) {
                throw new DockerServiceException(
                    `Le projet ${appName} n'existe pas.`,
                    HttpStatusCodes.NOT_FOUND
                );
            }

            const composeConfig = path.join(folderPath, 'docker-compose.yml');

            if (!fs.existsSync(composeConfig)) {
                throw new DockerServiceException(
                    `Fichier docker-compose.yml introuvable pour le projet ${appName}.`,
                    HttpStatusCodes.NOT_FOUND
                );
            }

            await compose.down({ cwd: folderPath, log: true });
            const containers: ContainerInfo[] = await this._docker.listContainers({ all: true });
            const projectContainers = containers.filter(container =>
                container.Labels['com.docker.compose.project'] === appName
            );

            for (const containerInfo of projectContainers) {
                const container = this._docker.getContainer(containerInfo.Id);
                await container.remove({ force: true });
            }


            const volumes = await this._docker.listVolumes();
            const projectVolumes = volumes.Volumes.filter(volume =>
                volume.Labels && volume.Labels['com.docker.compose.project'] === appName
            );

            for (const volumeInfo of projectVolumes) {
                const volume = this._docker.getVolume(volumeInfo.Name);
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

            if (containerInfo.State.Running) {
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
            const pythonProcess = spawn('python3', [path.join(__dirname, '..', '..', '.bin', 'check_all_available_ports.py')]);

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


    private async executeBashScript(folderPath: string): Promise<void> {
        const scriptPath = `${folderPath}/wpcli_setup.sh`;
        const outputLogPath = `${folderPath}/wpcli_output.log`;

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
                throw new DockerServiceException('Failed to set script as executable : \n' + chmodError, HttpStatusCodes.INTERNAL_SERVER_ERROR);
            }
        }

        const wpCliProcess = spawn('sh', [scriptPath], { cwd: folderPath });

        wpCliProcess.stdout.on('data', (data) => {
            console.log(`${data}`);
            fs.appendFileSync(outputLogPath, data);
        });

        wpCliProcess.stderr.on('data', (data) => {
            console.error(`${data}`);
            fs.appendFileSync(outputLogPath, data);
        });

        wpCliProcess.on('close', (code) => {
            if (code === 0) {
                fs.appendFileSync(outputLogPath, 'Script execution completed successfully.');
                if (!DirManager.deleteFile(scriptPath)) {
                    throw new Error(`Error deleting file`);
                }
            } else {
                fs.appendFileSync(outputLogPath, `Script execution failed with code ${code}`);
                throw new DockerServiceException(`Script execution failed with code ${code}`, HttpStatusCodes.INTERNAL_SERVER_ERROR);
            }
        });

        wpCliProcess.on('error', (err) => {
            console.error('Failed to start child process:', err);
            fs.appendFileSync(outputLogPath, `Failed to start child process: ${err}`);
            throw new DockerServiceException(`Failed to start child process: ${err}`, HttpStatusCodes.INTERNAL_SERVER_ERROR);
        });
    };

    private handleError(error: any): HttpResponse {
        console.log(error)
        if (error instanceof DockerServiceException) {
            return { message: error.message, status: error.status };
        } else {
            return { message: 'Internal Server Error', status: 500 };
        }
    }
}


import { Request, Response } from 'express'; 
import { Controller, HttpResponse } from './ControllerInterface';
import DockerService from '../service/DockerService';
import HttpStatusCodes from '../utils/HttpStatusCode';
import { GenerateRequestBody } from '../@type/global.d';

export default class DockerController implements Controller {
  public readonly ROUTE: Array<string>;
  private readonly _dockerService: DockerService;

  public constructor(dockerService :DockerService) {
    this._dockerService = dockerService;
    this.ROUTE = [
      '@POST(/build/template,createTemplate)',
      '@GET(/build/build-app,runBuildMachine)',
      '@GET(/containers,getAllContainers)',
      '@GET(/images,getAllImages)',
      '@POST(/containers/:id/start,startContainer)',
      '@POST(/containers/:id/stop,stopContainer)',
      '@POST(/containers/:app_name/stop-compose, stopCompose)',
      '@POST(/containers/:app_name/start-compose, startCompose)',
      '@POST(/containers/:id/remove,removeContainer)'
    ];
  }


/**
 * @Mapping POST(/build/template)
 * Builds template docker-compose container.
 * @param {Request} request - The request object.
 * @param {Response} response - The response object.
 * @returns {Promise<void>}
 */
  public async createTemplate(request: Request, response: Response): Promise<void> {
    const requestBody = {
      dirname: request.body.dirname,
      username: request.body.username,
      email: request.body.email,
      wpPassword: request.body.wp_psswd,
      wpPort: request.body.wp_port,
      wpHost: request.body.wp_host,
      wpProjectName: request.body.wp_project_name,
      mysqlRootPassword: request.body.mysql_root_psswd,
      mysqlUser: request.body.mysql_user,
      mysqlPassword: request.body.mysql_psswd,
      mysqlPort: request.body.mysql_port,
      nameApiKey: request.body.name_api_key,
      rules: request.body.rules,
      addons : request.body.addons
    } as GenerateRequestBody;
    
    try {
      const { status, message } : HttpResponse = await this._dockerService.buildTemplate(requestBody);
      response.status(status).json({ response : message});
    } catch (error: any) {
      response.status(error.status || HttpStatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: error.message });
    }
  }

/**
 * @Mapping GET(/build-app)
 * Builds the Docker container.
 * @param {Request} request - The request object.
 * @param {Response} response - The response object.
 * @returns {Promise<void>}
 */
  public async runBuildMachine(request: Request, response: Response): Promise<void> {
    const { appName } = request.query;
    try {
      const { status, message } : HttpResponse = await this._dockerService.build(appName as unknown as string);
      response.status(status).json(message);
    } catch (error: any) {
       response.status(error.status || HttpStatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: error.message });
    }
  }


  /**
  * @Mapping GET(/containers)
  * Retrieves all Docker containers.
  * @param {Request} request - The request object.
  * @param {Response} response - The response object.
  * @returns {Promise<void>}
  */
  public async getAllContainers(request: Request, response: Response): Promise<void> {
    const { status, message }: HttpResponse = await this._dockerService.getContainersInfos();
    try {
      response.status(status).json(message);
    } catch (error: any) {
      response.status(error.status || HttpStatusCodes.INTERNAL_SERVER_ERROR)
     .json({ message: error.message });
    }
  }


/**
 * @Mapping GET(/images)
 * Retrieves all Docker images.
 * @param {Request} request - The request object.
 * @param {Response} response - The response object.
 * @returns {Promise<void>}
 */
  public async getAllImages(request: Request, response: Response): Promise<void> {
    const { status, message }: HttpResponse = await this._dockerService.getImagesInfos();
    try {
      response.status(status).json(message);
    } catch (error: any) {
      response.status(error.status || HttpStatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: error.message });
    }
  }


  /**
   * @Mapping POST(/containers/:id/start)
   * start a Docker container.
   * @param {Request} request - The request object.
   * @param {Response} response - The response object.
   * @returns {Promise<void>}
   */
  public async startContainer(request: Request, response: Response): Promise<void> {
    const { id } = request.params;
    try {
      const { status, message }: HttpResponse = await this._dockerService.runContainer(id);
      response.status(status).json({ message: message });
    } catch (error: any) {
      response.status(error.status || HttpStatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: error.message });
    }
  }


  /**
   * @Mapping POST(/containers/:id/stop)
   * Stops a Docker container.
   * @param {Request} request - The request object.
   * @param {Response} response - The response object.
   * @returns {Promise<void>}
   */
    public async stopContainer(request: Request, response: Response): Promise<void> {
      const { id } = request.params;
      try {
        const  { status, message }: HttpResponse = await this._dockerService.stopContainer(id);
        response.status(status).json({ message: message});
      } catch (error: any) {
        response.status(error.status || HttpStatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: error.message });
      }
    }


  /**
   * @Mapping POST(/containers/:id/start-compose)
   * Start a Docker-compose container.
   * @param {Request} request - The request object.
   * @param {Response} response - The response object.
   * @returns {Promise<void>}
   */
    public async startCompose(request: Request, response: Response): Promise<void> {
      const { app_name } = request.params;
      try {
        const  { status, message }: HttpResponse = await this._dockerService.startDockerCompose(app_name);
        response.status(status).json({ message: message});
      } catch (error: any) {
        response.status(error.status || HttpStatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: error.message });
      }
    }

  
  /**
   * @Mapping POST(/containers/:id/stop-compose)
   * Stops a Docker-compose container.
   * @param {Request} request - The request object.
   * @param {Response} response - The response object.
   * @returns {Promise<void>}
   */
    public async stopCompose(request: Request, response: Response): Promise<void> {
      const { app_name } = request.params;
      try {
        const  { status, message }: HttpResponse = await this._dockerService.stopDockerCompose(app_name);
        response.status(status).json({ message: message});
      } catch (error: any) {
        response.status(error.status || HttpStatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: error.message });
      }
    }


  /**
   * @Mapping POST(/containers/:id/remove,removeContainer)
   * Remove a Docker container.
   * @param {Request} request - The request object.
   * @param {Response} response - The response object.
   * @returns {Promise<void>}
   */
  public async removeContainer(request: Request, response: Response): Promise<void> {
    const { id } = request.params;
    try {
      const { status, message }: HttpResponse = await this._dockerService.destroyContainer(id);
      response.status(status).json({ message: message });
    } catch (error: any) {
      response.status(error.status || HttpStatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: error.message });
    }
  }
}

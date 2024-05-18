import { Request, Response } from 'express'; 
import { Controller, HttpResponse } from './ControllerInterface';
import DockerService from '../service/DockerService';
import HttpStatusCodes from '../utils/HttpStatusCode';


export default class DockerController implements Controller {
  public readonly ROUTE: Array<string>;
  private readonly _dockerService: DockerService;

  public constructor(dockerService :DockerService) {
    this._dockerService = dockerService;
    this.ROUTE = [
      '@POST(/generate-docker,generate)',
      '@GET(/build-app,runBuildMachine)',
      '@GET(/containers,getAllContainers)',
      '@GET(/images,getAllImages)',
      '@POST(/containers/:id/start,startContainer)',
      '@POST(/containers/:id/stop,stopContainer)',
      '@POST(/containers/:app_name/stop-compose, stopCompose)',
      '@POST(/containers/:app_name/start-compose, startCompose)',
      '@POST(/containers/:id/remove,removeContainer)'
    ];
  }

  public async generate(request: Request, response: Response): Promise<void> {
    try {
      const res = await this._dockerService.generateDocker(request);
      response.status(200).json({ response : res });
    } catch (error: any) {
      response.status(400).json({ error: error.message });
    }
  }

/**
 * @Mapping GET(/build-app)
 * Builds the Docker container.
 * @param {Request} request - The request object.
 * @param {Response} response - The response object.
 * @returns {Promise<Response>}
 */
  public async runBuildMachine(request: Request, response: Response): Promise<Response> {
    try {
      const { appName } = request.query;
      const { status, message } : HttpResponse = await this._dockerService.build(appName as unknown as string);
      return response.status(status).json(message);
    } catch (error: any) {
      return response.status(error.status || HttpStatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: error.message });
    }
  }

  /**
  * @Mapping GET(/containers)
  * Retrieves all Docker containers.
  * @param {Request} request - The request object.
  * @param {Response} response - The response object.
  * @returns {Promise<Response>}
  */
  public async getAllContainers(request: Request, response: Response): Promise<Response> {
    try {
      const { status, message }: HttpResponse = await this._dockerService.getContainersInfos();
      return response.status(status).json(message);
    } catch (error: any) {
     return response.status(error.status || HttpStatusCodes.INTERNAL_SERVER_ERROR)
     .json({ message: error.message });
    }
  }
  
/**
 * @Mapping GET(/images)
 * Retrieves all Docker images.
 * @param {Request} request - The request object.
 * @param {Response} response - The response object.
 * @returns {Promise<Response>}
 */
  public async getAllImages(request: Request, response: Response): Promise<Response> {
    try {
      const { status, message }: HttpResponse = await this._dockerService.getImagesInfos();
      return response.status(status).json(message);
    } catch (error: any) {
      return response.status(error.status || HttpStatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: error.message });
    }
  }


  /**
   * @Mapping POST(/containers/:id/start)
   * start a Docker container.
   * @param {Request} request - The request object.
   * @param {Response} response - The response object.
   * @returns {Promise<Response>}
   */
  public async startContainer(request: Request, response: Response): Promise<Response> {
    const { id } = request.params;
    try {
      const { status, message }: HttpResponse = await this._dockerService.runContainer(id);
      return response.status(status).json({ message: message });
    } catch (error: any) {
      return response.status(error.status || HttpStatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: error.message });
    }
  }

  /**
   * @Mapping POST(/containers/:id/stop)
   * Stops a Docker container.
   * @param {Request} request - The request object.
   * @param {Response} response - The response object.
   * @returns {Promise<Response>}
   */
    public async stopContainer(request: Request, response: Response): Promise<Response> {
      const { id } = request.params;
      try {
        const  { status, message }: HttpResponse = await this._dockerService.stopContainer(id);
        return response.status(status).json({ message: message});
      } catch (error: any) {
        return response.status(error.status || HttpStatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: error.message });
      }
    }

  /**
   * @Mapping POST(/containers/:id/start-compose)
   * Start a Docker-compose container.
   * @param {Request} request - The request object.
   * @param {Response} response - The response object.
   * @returns {Promise<Response>}
   */
    public async startCompose(request: Request, response: Response): Promise<Response> {
      const { app_name } = request.params;
      try {
        const  { status, message }: HttpResponse = await this._dockerService.startDockerCompose(app_name);
        return response.status(status).json({ message: message});
      } catch (error: any) {
        return response.status(error.status || HttpStatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: error.message });
      }
    }
  /**
   * @Mapping POST(/containers/:id/stop-compose)
   * Stops a Docker-compose container.
   * @param {Request} request - The request object.
   * @param {Response} response - The response object.
   * @returns {Promise<Response>}
   */
    public async stopCompose(request: Request, response: Response): Promise<Response> {
      const { app_name } = request.params;
      try {
        const  { status, message }: HttpResponse = await this._dockerService.stopDockerCompose(app_name);
        return response.status(status).json({ message: message});
      } catch (error: any) {
        return response.status(error.status || HttpStatusCodes.INTERNAL_SERVER_ERROR)
        .json({ message: error.message });
      }
    }

  /**
   * @Mapping POST(/containers/:id/remove,removeContainer)
   * Remove a Docker container.
   * @param {Request} request - The request object.
   * @param {Response} response - The response object.
   * @returns {Promise<Response>}
   */
  public async removeContainer(request: Request, response: Response): Promise<Response> {
    const { id } = request.params;
    try {
      const { status, message }: HttpResponse = await this._dockerService.destroyContainer(id);
      return response.status(status).json({ message: message });
    } catch (error: any) {
      return response.status(error.status || HttpStatusCodes.INTERNAL_SERVER_ERROR)
      .json({ message: error.message });
    }
  }
}

// import Dockerode, { ContainerInfo, ContainerInspectInfo, ContainerListOptions, ImageInfo } from 'dockerode';

// export default class ContainerManger {
//   private readonly _docker: Dockerode;
//   constructor(dockernode: Dockerode) {
//     this._docker = dockernode;
//   }

//   public async getContainersInfos(): Promise<Dockerode.ContainerInfo[]> {
//     const containerInfo: ContainerInfo[] = await this._docker.listContainers({ all: true });
//     return containerInfo;
//   }


//   public async startDockerCompose(appName: string): Promise<HttpResponse> {
//     try {
//         const folderPath: string = path.join(DockerService.WP_SITES_DIR_PATH, appName);
//         await compose.upAll({ cwd: folderPath, log: true })

//         return { message: `Docker Compose for ${appName} started successfully.`, status: HttpStatusCodes.OK };
//     } catch (error: any) {
//         return this.handleError(error);
//     }
// }

// }
import Dockerode, { Container, ContainerInfo, ContainerInspectInfo, ImageInfo } from "dockerode";
import { v2 as compose } from 'docker-compose'
import ComposeManager from "./ComposeManager";

export default class DockerManager extends ComposeManager {
    private readonly _docker: Dockerode;

    public constructor(docker: Dockerode) {
        super()
        this._docker = docker;
    }

    public async getContainersInfos(): Promise<ContainerInfo[]> {
        return this._docker.listContainers({ all: true });
    }

    public async getImagesInfos(): Promise<ImageInfo[]> {
        return this._docker.listImages();
    }

    public async runContainer(containerId: string): Promise<boolean> {
        const container: Container = this._docker.getContainer(containerId);
        const containerInfo: ContainerInspectInfo = await container.inspect();

        return containerInfo.State.Running ? false : (await container.start(), true);
    }
    

    public async stopContainer(containerId: string): Promise<boolean> {
        const container: Container = this._docker.getContainer(containerId);
        const containerInfo: ContainerInspectInfo = await container.inspect();
    
        return containerInfo.State.Running ? (await container.stop(), true) : false;
    }
    

    public async removeContainer(containerId: string): Promise<void> {
        const container = this._docker.getContainer(containerId);
        await container.remove();
    }

}

import { artifacts, ethers, network } from "hardhat";
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying with ${deployer.address} on ${network.name}`);

  // Deploy CompetitionRegistry
  const CompetitionRegistry = await ethers.getContractFactory("CompetitionRegistry");
  const registry = await CompetitionRegistry.deploy();
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log("CompetitionRegistry:", registryAddress);

  // Deploy Certificate
  const Certificate = await ethers.getContractFactory("RecordCertificate");
  const cert = await Certificate.deploy("Sports Record Certificate", "SRC");
  await cert.waitForDeployment();
  const certAddress = await cert.getAddress();
  console.log("RecordCertificate:", certAddress);

  // Set minter to CompetitionRegistry (owner is deployer by default)
  const setMinterTx = await cert.setMinter(registryAddress);
  await setMinterTx.wait();

  // Write deployments
  const baseDir = join(__dirname, "..", "deployments", network.name);
  mkdirSync(baseDir, { recursive: true });

  const registryArtifact = await artifacts.readArtifact("CompetitionRegistry");
  const certArtifact = await artifacts.readArtifact("RecordCertificate");

  const registryOut = {
    address: registryAddress,
    abi: registryArtifact.abi,
    network: network.name,
    chainId: (await ethers.provider.getNetwork()).chainId.toString(),
  };
  const certOut = {
    address: certAddress,
    abi: certArtifact.abi,
    network: network.name,
    chainId: (await ethers.provider.getNetwork()).chainId.toString(),
  };

  writeFileSync(join(baseDir, "CompetitionRegistry.json"), JSON.stringify(registryOut, null, 2));
  writeFileSync(join(baseDir, "RecordCertificate.json"), JSON.stringify(certOut, null, 2));

  console.log("Deployment files written to", baseDir);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});








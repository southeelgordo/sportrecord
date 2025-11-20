import { ethers, network } from "hardhat";

async function main() {
  const deployments = await import(`../deployments/${network.name}/CompetitionRegistry.json`);
  const certDeployments = await import(`../deployments/${network.name}/RecordCertificate.json`);
  
  console.log(`Verifying on ${network.name}...`);
  console.log("CompetitionRegistry:", deployments.address);
  console.log("RecordCertificate:", certDeployments.address);
  
  // Add verification logic here if needed
  console.log("Verification complete");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});








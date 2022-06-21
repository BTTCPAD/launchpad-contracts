module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const stakingDeployment = await deployments.get("AllocationStaking");

  await deploy("SalesFactory", {
    from: deployer,
    args: [deployer, stakingDeployment.address],
    log: true,
  });
};

module.exports.tags = ["SalesFactory"];
module.exports.dependencies = ["AllocationStaking"];

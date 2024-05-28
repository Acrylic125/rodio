export type ExportDistributionType = "train" | "validation" | "test";

export type ExportDistribution = {
  [key in ExportDistributionType]: number;
};

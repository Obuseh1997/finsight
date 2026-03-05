export const handler = async () => {
  await fetch(`${process.env.PYTHON_API_URL}/health`).catch(() => {});
};

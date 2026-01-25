export let isQuitting = false;
export const setQuitting = (value: boolean) => {
  isQuitting = value;
};
export const getQuitting = () => isQuitting;

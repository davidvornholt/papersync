import { handleHomeworkRequest, homeworkOptions } from '@/shared/homework/http';
export const GET = (request: Request) => handleHomeworkRequest(request);
export const POST = (request: Request) => handleHomeworkRequest(request);
export const OPTIONS = () => homeworkOptions();

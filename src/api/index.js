import axios from 'axios';

const API = axios.create({ baseURL: 'https://map-file-upload-server.vercel.app', headers:{
  'X-Requested-With': 'XMLHttpRequest'
  }
});

// GET APIS
export const getSignedUrl = (fileName, fileType) => API.get('/getSignedUrl', {
  params:
    {
      file: fileName,
      type: fileType
    }
});
export const allJobs = () => API.get('/all_jobs');
export const resolveJob = (job_id) => API.get(`/jobs/resolve/${job_id}`);
export const removeJob = (job_id) => API.get(`/jobs/remove/${job_id}`);

// POST APIs
export const newJob = (body) => API.post(`/new_job`, body);

// export const getResponse = (data) => API.post(`/get_response`, data);
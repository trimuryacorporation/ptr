export const siteOrigin = 'https://ptr.trimuryacorporation.in';
export const publicPages = {
  '/login': {
    title: 'Trimurya Corporation | Participant Recording Workspace',
    description: 'Sign in to the Trimurya Corporation recording workspace. Participants can use email or mobile OTP, access their workspace, and download the Android app.'
  },
  '/download': {
    title: 'Download Trimurya Participant Android App | Trimurya Corporation',
    description: 'Download the Trimurya Participant Android APK and watch the Hindi training video. Find installation steps and access your recording workspace.'
  }
};
export function pageSchema(path) {
  const page = publicPages[path];
  if (!page) return null;
  const organization = {'@type':'Organization','@id':siteOrigin+'/#organization',name:'Trimurya Corporation',url:siteOrigin,logo:siteOrigin+'/images/trimurya-logo.svg'};
  const webPage = {'@type':'WebPage','@id':siteOrigin+path+'#webpage',url:siteOrigin+path,name:page.title,description:page.description,inLanguage:'en',publisher:{'@id':organization['@id']}};
  const graph = [organization,webPage];
  if (path === '/download') graph.push({'@type':'SoftwareApplication',name:'Trimurya Participant',operatingSystem:'Android',applicationCategory:'BusinessApplication',downloadUrl:siteOrigin+'/downloads/Trimurya-Participant.apk',url:siteOrigin+path,publisher:{'@id':organization['@id']}});
  return {'@context':'https://schema.org','@graph':graph};
}

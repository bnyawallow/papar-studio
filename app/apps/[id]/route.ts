
import { getProjectById } from '../../../utils/storage';
import { generateAFrameHtml } from '../../../utils/exportUtils';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const projectId = params.id;
    const project = await getProjectById(projectId);

    if (!project) {
      return new Response("Project not found", { status: 404 });
    }

    // Determine the mindFile URL.
    // If the project was published with a persistent URL (e.g. from Supabase Storage), use it.
    // Otherwise, we might fail if it was a blob URL from the client session.
    // However, for the purpose of the "Publish" flow in this app:
    // 1. The client compiles the mind file.
    // 2. The client uploads it or converts to Base64 data URI.
    // 3. The client saves the project with this new URL.
    // 4. This route reads that URL.

    // Fallback: If no mind file is compiled in the project data, we can't serve a working app.
    // We check the first target's mindFileUrl or a global one if we had it.
    // The current data structure stores mindFileUrl per target, but the Compiler generates one .mind file for all.
    // Usually, we attach the compiled URL to the first target or a project-level field.
    // We'll check the first target.
    
    let mindFileUrl = project.targets[0]?.mindFileUrl;

    if (!mindFileUrl) {
        return new Response("Project targets have not been compiled. Please open the editor and Compile before publishing.", { status: 400 });
    }

    // Generate the HTML
    const html = generateAFrameHtml(project, undefined, mindFileUrl);

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html',
      },
    });

  } catch (e) {
    console.error(e);
    return new Response("Internal Server Error", { status: 500 });
  }
}

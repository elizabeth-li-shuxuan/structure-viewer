// 4/3/2025 Elizabeth Li
// visualize .vtp brain structure files with vtk, process user-inputted rating

function initializeVTK(filename){
    const container = document.getElementById('vtk-container');

    // Render window
    const renderWindow = vtk.Rendering.Core.vtkRenderWindow.newInstance();
    const renderer = vtk.Rendering.Core.vtkRenderer.newInstance();
    renderWindow.addRenderer(renderer);
    const openglRenderWindow = vtk.Rendering.OpenGL.vtkRenderWindow.newInstance();
    openglRenderWindow.setContainer(container);
    renderWindow.addView(openglRenderWindow);
    
    // Synchronize canvas size with container
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    openglRenderWindow.setSize(containerWidth, containerHeight);

    // Interactor for user interactions
    const interactor = vtk.Rendering.Core.vtkRenderWindowInteractor.newInstance();
    interactor.setView(openglRenderWindow);
    interactor.initialize();

    // Set a trackball-style interactor
    const interactorStyle = vtk.Interaction.Style.vtkInteractorStyleTrackballCamera.newInstance();
    interactor.setInteractorStyle(interactorStyle);

    interactor.bindEvents(container);
    interactor.start();

    // Update canvas size on window resize
    window.addEventListener('resize', () => {
        const newWidth = container.clientWidth;
        const newHeight = container.clientHeight;
        openglRenderWindow.setSize(newWidth, newHeight);
        renderWindow.render();
    });

    // Create a VTP reader instance
    const reader = vtk.IO.XML.vtkXMLPolyDataReader.newInstance();

    // Fetch VTP file from server
    fetch(`/uploads/${filename}`)
        .then(response => response.arrayBuffer())
        .then(data => {
            reader.parseAsArrayBuffer(data);

            // Create mapper and actor
            const mapper = vtk.Rendering.Core.vtkMapper.newInstance();
            mapper.setInputConnection(reader.getOutputPort());
            const actor = vtk.Rendering.Core.vtkActor.newInstance();
            actor.setMapper(mapper);

            // Render the scene
            renderer.addActor(actor);
            renderer.resetCamera();
            renderWindow.render();
        })
        .catch(error => console.error('Error loading VTP file:', error));
}

// Check if a file has been uploaded and initialize visualization
document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.addEventListener('change', function() {
            this.form.submit();
        });
    }
    if (window.filename){
        initializeVTK(window.filename);
    }
});


// Submit a user-inputted rating for a given file to the server
// Now accepts both filename and rating as arguments
function submitRating(filename, rating){
    fetch('/rate', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({filename: filename, rating: rating})
    })
    .then(response => response.json())
    .then(data => {
        alert('Rating submitted successfully');
        console.log(data);
    })
    .catch(error => console.error('Error submitting rating:', error));
}


// Listen for key presses (1, 2, 3) for primary rating submission
document.addEventListener('keydown', function(event) {
    // Only handle keys if a file has been uploaded
    if (!window.filename) return;
    if (event.key === '1' || event.key === '2' || event.key === '3') {
        submitRating(window.filename, parseInt(event.key));
    }
});

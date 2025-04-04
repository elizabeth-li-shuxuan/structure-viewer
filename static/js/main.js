// 4/3/2025 Elizabeth Li
// visualize .vtp brain structure files with vtk, process user-inputted rating

function initializeVTK(filename){
    const container = document.getElementById('vtk-container');

    //render window
    const renderWindow = vtk.Rendering.Core.vtkRenderWindow.newInstance();
    const renderer = vtk.Rendering.Core.vtkRenderer.newInstance();
    renderWindow.addRenderer(renderer);
    const openglRenderWindow = vtk.Rendering.OpenGL.vtkRenderWindow.newInstance();
    openglRenderWindow.setContainer(container);
    renderWindow.addView(openglRenderWindow);
    
    //synchronize canvas size with container
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    openglRenderWindow.setSize(containerWidth, containerHeight);

    //interactor for user interactions
    const interactor = vtk.Rendering.Core.vtkRenderWindowInteractor.newInstance();
    interactor.setView(openglRenderWindow);
    interactor.initialize();

    // set a trackball-style interactor
    const interactorStyle = vtk.Interaction.Style.vtkInteractorStyleTrackballCamera.newInstance();
    interactor.setInteractorStyle(interactorStyle)

    interactor.bindEvents(container);
    interactor.start();

    // update canvas size on window resize
    window.addEventListener('resize', () => {
        const newWidth = container.clientWidth; // Get updated container width on resize
        const newHeight = container.clientHeight; // Get updated container height on resize
        openglRenderWindow.setSize(newWidth, newHeight); // Update canvas size accordingly
        renderWindow.render(); // Re-render the scene with new dimensions
    });

    //create a VTP reader instance
    const reader = vtk.IO.XML.vtkXMLPolyDataReader.newInstance();

    //fetch VTP file from server
    fetch(`/uploads/${filename}`)
        .then(response => response.arrayBuffer())
        .then(data => {
            reader.parseAsArrayBuffer(data);

            //create mapper and actor
            const mapper = vtk.Rendering.Core.vtkMapper.newInstance();
            mapper.setInputConnection(reader.getOutputPort());
            const actor = vtk.Rendering.Core.vtkActor.newInstance();
            actor.setMapper(mapper);

            //render the scene
            renderer.addActor(actor);
            renderer.resetCamera();
            renderWindow.render();
        })
        .catch(error => console.error('Error loading VTP file:', error));
}

//check if a file has been uploaded and initialize visualization
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

//submit a user-inputted rating for a given file to the server
function submitRating(filename){
    const rating = document.getElementById('rating').value;

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

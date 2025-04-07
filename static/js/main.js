// 4/3/2025 Elizabeth Li
// visualize .vtp brain structure files with vtk, process user-inputted rating

// Helper function to update the progress display
function updateProgress(){
    // Total files is the length of the filenames array
    const total = window.filenames ? window.filenames.length : 1;
    // Number of rated files equals the current index
    const rated = window.currentFileIndex;
    const progressElement = document.getElementById('progress');
    if (progressElement) {
        progressElement.innerText = "(" + rated + " / " + total + " rated)";
    }
}

function initializeVTK(filename){
    const container = document.getElementById('vtk-container');

    // Render window and renderer
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

    // Create an interactor but do not bind the default mouse events.
    const interactor = vtk.Rendering.Core.vtkRenderWindowInteractor.newInstance();
    interactor.setView(openglRenderWindow);
    interactor.initialize();
    const interactorStyle = vtk.Interaction.Style.vtkInteractorStyleTrackballCamera.newInstance();
    interactor.setInteractorStyle(interactorStyle);
    // Do not call interactor.bindEvents(container) to disable drag-based rotation.
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

    // Declare actor variable so it can be accessed in the mousemove handler
    let actor = null;

    // Fetch VTP file from server
    fetch(`/uploads/${filename}`)
        .then(response => response.arrayBuffer())
        .then(data => {
            reader.parseAsArrayBuffer(data);

            // Create mapper and actor
            const mapper = vtk.Rendering.Core.vtkMapper.newInstance();
            mapper.setInputConnection(reader.getOutputPort());
            actor = vtk.Rendering.Core.vtkActor.newInstance();
            actor.setMapper(mapper);

            // Render the scene
            renderer.addActor(actor);
            renderer.resetCamera();

            // Adjust the camera position to move it further away
            const camera = renderer.getActiveCamera();
            const focalPoint = camera.getFocalPoint();
            const position = camera.getPosition();
            const vector = [
                position[0] - focalPoint[0],
                position[1] - focalPoint[1],
                position[2] - focalPoint[2]
            ];
            const factor = 4.75; // Increase distance by 50%
            camera.setPosition(
                focalPoint[0] + vector[0] * factor,
                focalPoint[1] + vector[1] * factor,
                focalPoint[2] + vector[2] * factor
            );

            // Adjust the camera's view angle to zoom in
            camera.setViewAngle(5); // default = 30°, smaller angle means larger view

            renderer.resetCameraClippingRange();
            renderWindow.render();

            // custom code for brain to rotate on hover instead of click:
            container.addEventListener('mousemove', function(e) {
                if (!actor) return;
                // Get container's bounding rectangle
                const rect = container.getBoundingClientRect();
                // Compute center of container
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                // Compute mouse position relative to container
                const mouseX = e.clientX - rect.left;
                const mouseY = e.clientY - rect.top;
                // Calculate offset from center
                const offsetX = mouseX - centerX;
                const offsetY = mouseY - centerY;
                // Sensitivity factor: adjust for desired rotation effect
                const sensitivity = 0.5;
                // Determine rotation angles: vertical movement rotates about X-axis, horizontal about Y-axis
                const rotationX = offsetY * sensitivity;
                const rotationY = offsetX * sensitivity;
                // Update actor orientation (roll remains 0)
                actor.setOrientation(rotationX, rotationY, 0);
                renderWindow.render();
            });
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

function submitRating(filename, rating){
    fetch('/rate', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({filename: filename, rating: rating})
    })
    .then(response => response.json())
    .then(data => {
        // Display inline notification for rating success
        const notification = document.getElementById('notification');
        if (notification) {
            notification.innerText = 'Rating submitted successfully';
            notification.style.display = 'block';
            // Hide the notification after 2 seconds
            setTimeout(() => {
                notification.style.display = 'none';
            }, 2000);
        }
        console.log(data);
        
        // After a rating is submitted, if there are more files, advance to the next one.
        if (window.filenames && window.currentFileIndex < window.filenames.length - 1) {
            window.currentFileIndex++;
            window.filename = window.filenames[window.currentFileIndex];
            
            // Update the displayed filename
            const filenameElement = document.getElementById('uploadedFilename');
            if (filenameElement) {
                filenameElement.innerHTML = "Uploaded file: " + window.filename + "<br><span id='progress' style='font-size: 14px; color: white; font-weight: normal;'></span>";
            }

            // Update progress display
            updateProgress();

            // Clear the VTK container and reinitialize with the next file.
            const container = document.getElementById('vtk-container');
            container.innerHTML = "";  // Clear the container
            initializeVTK(window.filename);
        } else {
            // Update progress display for the final file before alerting.
            updateProgress();
            // Pop up an alert when all files have been rated
            alert("All files have been rated.");
        }
    })
    .catch(error => console.error('Error submitting rating:', error));
}

// Function to go back to the previous file
function goBack(){
    if (window.filenames && window.currentFileIndex > 0){
        let targetFilename = window.filenames[window.currentFileIndex -1];

        fetch('/delete_rating', {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify({filename: targetFilename})
        })
        .then(response => response.json())
        .then(data => {
            console.log("Rating deleted for " + targetFilename, data);
            window.currentFileIndex--;
            window.filename = window.filenames[window.currentFileIndex];

            // Update displayed filename
            const filenameElement = document.getElementById('uploadedFilename');
            if (filenameElement){
                filenameElement.innerHTML = "Uploaded file: " + window.filename + "<br><span id='progress' style='font-size: 14px; color: white; font-weight: normal;'></span>";
            }

            updateProgress();

            // clear vtk container, reinitialize with previous file
            const container = document.getElementById('vtk-container');
            container.innerHTML = "";
            initializeVTK(window.filename);
        })
        .catch(error => console.error('Error deleting rating:', error));

    } else {
        alert("You are already at the first file.");
    }
}

// Listen for key presses
document.addEventListener('keydown', function(event) {
    if (!window.filename) return;
    if (event.key === '1' || event.key === '2' || event.key === '3') {
        submitRating(window.filename, parseInt(event.key));
    }
    if (event.key === 'b' || event.key === 'B'){
        goBack();
    }
});
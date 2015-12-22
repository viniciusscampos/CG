var camera, controls, scene, renderer, raycaster, offset, plane;
var selection = null;
var objects = [];
var container = null;
var dimensions = 50;
var ballMesh;
var moveObject = false;
var moveMode = true;
var rotateStartPoint = { x: 0, y:0};
var isDragging = false;

function init(){
		//Create main scene
		scene = new THREE.Scene();
		scene.fog = new THREE.FogExp2(0xccee0ff, 0.0003);

		raycaster = new THREE.Raycaster();
		offset = new THREE.Vector3();

		var SCREEN_WIDTH = window.innerWidth, SCREEN_HEIGHT = window.innerHeight;	
		// camera attributes
		var VIEW_ANGLE = 45, ASPECT = SCREEN_WIDTH / SCREEN_HEIGHT, NEAR = 0.1, FAR = 10000;
		// set up camera
		camera = new THREE.PerspectiveCamera( VIEW_ANGLE, ASPECT, NEAR, FAR);
		camera.position.z = 1000;
		// add the camera to the scene
		scene.add(camera);

		//create the objects
		createCube([dimensions,dimensions,dimensions],[randomcolor()],[0,0,0]);

		//Insert the objects in the scene
		insertObjects();
		
		//Prepare webgl renderer
		renderer = new THREE.WebGLRenderer();
		renderer.setSize( window.innerWidth, window.innerHeight );
		renderer.setClearColor( 0xffffff);
		document.body.appendChild( renderer.domElement );
		
		//Events
		THREEx.WindowResize(renderer, camera);
		document.addEventListener("mousedown", onMouseLeftButtomDown, false);
		document.addEventListener("mousemove", onMouseLeftButtomPressed, false);
		document.addEventListener("mouseup", mouseReleased, false);
		document.addEventListener("keypress", onKeyPressed, false);

		//Prepare Orbit controls
		controls = new THREE.OrbitControls( camera );
		controls.addEventListener( 'change' , render);

		// lights
		light = new THREE.DirectionalLight( 0xffffff );
		light.position.set( 1, 1, 1 );
		scene.add( light );

		light = new THREE.DirectionalLight( 0x002288 );
		light.position.set( -1, -1, -1 );
		scene.add( light );

		light = new THREE.AmbientLight( 0x222222 );
		scene.add( light );

		//Plane, that helps to determinate an intersection position
		plane = new THREE.Mesh(new THREE.PlaneBufferGeometry(5000,5000,8), new THREE.MeshLambertMaterial({color: 0xffffff, opacity:0, transparent: true, opacity:0}));
		scene.add(plane);
		plane.visible = true;

}



function createCube(geometry,desiredMaterial,position){
	//receives an array containing the geometry, another array containing the informations of the desired material and the position where the cube must be created
	//responsible for create the desired cube mesh

	var geometry = new THREE.BoxGeometry(geometry[0],geometry[1],geometry[2]);

	var material = new THREE.MeshLambertMaterial ( { color: desiredMaterial[0]} );

	var mesh = new THREE.Mesh( geometry, material);

	mesh.position.set(position[0],position[1],position[2]);

	objects.push(mesh);

	return mesh;
}

function insertObjects(){
	//insert all the created objects on the scene
		for(var i =0; i< objects.length; i++){
			scene.add(objects[i]);
		}
}


function onKeyPressed(event){						
	if(event.keyCode == 100){		
		if(selection != null){
			scene.remove(selection);					
			var index = objects.indexOf(selection);
			objects.splice(index, 1);
			selection = null;
			//in case the cube was selected on the rotate mode
			if(container != null){
				scene.remove(container);
				container = null;
			}
		}
	}
	//if the key pressed iguals "c" change the current mode between rotate and move
	else if(event.keyCode == 99){
		moveMode = !moveMode;

	}
}

function animate()
{
	requestAnimationFrame ( animate );

	render();
	controls.update();
}

function render(){
	renderer.render(scene, camera);
}

function update(){
	controls.update();
}

function createContainer(selectedCube){
	//create a container to involve the current selected cube
	//stores the center of the current selected cube
	pos = [selection.position.x, selection.position.y, selection.position.z]

	//create a new mesh to be used in the BoxHelper
	var geometry = new THREE.BoxGeometry(dimensions + 4, dimensions+4,dimensions+4);
	var material = new THREE.MeshLambertMaterial ( { color: 0xffffff} );
	var mesh = new THREE.Mesh( geometry, material);	

	mesh.position.x = pos[0];
	mesh.position.y = pos[1];
	mesh.position.z = pos[2];

	mesh.updateMatrix();
	mesh.matrixAutoUpdate = false;

	var cube = new THREE.BoxHelper( mesh );
	cube.material.color.set("black");

	scene.add(cube);
	container = cube;
}

function createNewCubes(){
	//create the cubes
	if(selection == null){
		event.preventDefault();
		var mouseX = (event.clientX / window.innerWidth) * 2 - 1;
		var mouseY = -(event.clientY / window.innerHeight) * 2 + 1;

		//Get 3D vector from 3D mouse position using 'unproject' function
		var vector = new THREE.Vector3(mouseX,mouseY,1);
		vector.unproject(camera);

		var dir = vector.sub(camera.position).normalize();

		var distance = - camera.position.z / dir.z;
 
		var pos = camera.position.clone().add( dir.multiplyScalar(distance));

		var cube = createCube([dimensions,dimensions,dimensions],[randomcolor()],[pos.x,pos.y,pos.z]);

		scene.add(cube);
	}	
}

function drawSphere(x,y,z){
	//draw the sphere to help the user to get oriented when rotating the object or the scene
	var geometry = new THREE.SphereGeometry(60,32,32);
	var material = new THREE.MeshBasicMaterial({color: 999999, transparent: true, opacity	: 0.2});
	ballMesh = new THREE.Mesh(geometry, material);
	ballMesh.position.x = x;
	ballMesh.position.y = y;
	ballMesh.position.z = z;
	scene.add(ballMesh);
}

function toRadians(angle){
	//convert from degrees to radians
	return angle * (Math.PI / 100);
}

function onMouseLeftButtomDown (event){
	isDragging = true;
	event.preventDefault();

	var mouseX = (event.clientX / window.innerWidth) * 2 - 1;
	var mouseY = -(event.clientY / window.innerHeight) * 2 + 1;

	//Get 3D vector from 3D mouse position using 'unproject' function
	var vector = new THREE.Vector3(mouseX,mouseY,1);
	vector.unproject(camera);

	//Set the raycaster position
	raycaster.set(camera.position, vector.sub(camera.position).normalize());

	//Find all intersected objects
	var intersects = raycaster.intersectObjects(objects);
	//check if the current mode is the move mode
	if(moveMode){
		controls.enabled = false;		
		if(intersects.length > 0){
			controls.enabled = false;
			selection = intersects[0].object;
			moveObject = true;
			//check if there is any container already active
			if(container != null){
				scene.remove(container);
				container = null;
			}
			//create the container
			createContainer(selection);
		}

		else if (intersects.length == 0){
			selection = null;
			//remove the container that was already active
			scene.remove(container);
			container = null;
			//create the new cube centered at the mouse coordinate click			
			createNewCubes();
		}
		//update the current offset
		if(selection != null && container == null){
				var intersects = raycaster.intersectObject(plane);
				offset.copy(intersects[0].point).sub(plane.position);
		}
		

	}
	//check if the current mode is the rotate mode
	else if(!moveMode){
		controls.enabled = true;
		if(intersects.length > 0){
			//the user clicked on a existent cube that he might desire to rotate
			selection = intersects[0].object;		
			//check if there is any container already active
			if(container != null){
				scene.remove(container);
				container = null;
			}

			drawSphere(selection.position.x,selection.position.y,selection.position.z);
			controls.enabled = false;
			
			
		}
		//clicked somewere on the screen that a cube isn't present
		else{
			selection = null;
			//remove the container that was already active
			scene.remove(container);
			container = null;

			drawSphere(0,0,0);
			controls.enabled = true;
		}

	}
}

function mouseReleased(event){
	if(moveMode){
		moveObject = false;
		isDragging = false;
	}
	if(!moveMode){
		controls.enabled = false;
		scene.remove(ballMesh);
		isDragging = false;		
	}
}

function onMouseLeftButtomPressed(cube){
	var deltaMove = {
			x: event.offsetX - rotateStartPoint.x,
			y: event.offsetY - rotateStartPoint.y
	}
	if(moveObject){				
		event.preventDefault();
		//Get mouse position
		var mouseX = (event.clientX / window.innerWidth) * 2 - 1;
		var mouseY = -(event.clientY / window.innerHeight) * 2 + 1;

		//Get 3D vector from 3D mouse position using 'unproject' function
		var vector = new THREE.Vector3(mouseX,mouseY,1);
		vector.unproject(camera);

		//Set the raycaster position
		raycaster.set(camera.position, vector.sub(camera.position).normalize());
		var intersects = raycaster.intersectObjects(objects);
		if(selection != null){
			var intersects = raycaster.intersectObject(plane);
			if(intersects.length > 0) {
				selection.position.copy(intersects[0].point.sub(offset));
				scene.remove(container);
				createContainer(selection);	
			}
			else{
				selection = null;
			}							
		}		
		else{
			var intersects = raycaster.intersectObjects(scene.children);
			//update the plane
			if(intersects.length >0){
				plane.position.copy(intersects[0].object.position);
				plane.lookAt(camera.position);
			}
		}
	}
	else if(!moveMode){
		if(isDragging){
			event.preventDefault();
			//Get mouse position
			var mouseX = (event.clientX / window.innerWidth) * 2 - 1;
			var mouseY = -(event.clientY / window.innerHeight) * 2 + 1;

			//Get 3D vector from 3D mouse position using 'unproject' function
			var vector = new THREE.Vector3(mouseX,mouseY,1);
			vector.unproject(camera);

			raycaster.set(camera.position, vector.sub(camera.position).normalize());

			var intersects = raycaster.intersectObjects(objects);
			//check if there isnt any cube selected
			if (intersects.length == 0){
				plane.lookAt(camera.position);
			}
			//any cube was selected
			else{
				if(selection != null){
					var deltaRotateQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler
						(toRadians(deltaMove.y * 1),toRadians(deltaMove.x* 1),0,'XYZ'));
					selection.quaternion.multiplyQuaternions(deltaRotateQuaternion,selection.quaternion);
				}
			}
			rotateStartPoint = {
				x: event.offsetX,
				y: event.offsetY
			}
		}	
}
}

init();
animate();

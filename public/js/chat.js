const socket = io() // function, which connecting client to the server. We have socket on server and one on client's side

// Elements
const $messageForm = document.querySelector('#message-form')// putting dollar sign '$' before name of variables for some DOM elements is a convention
const $messageFormInput = $messageForm.querySelector('input')
const $messageFormButton = $messageForm.querySelector('button')
const $sendLocationButton = document.querySelector('#send-location')
const $messages = document.querySelector('#messages') //location where we want to render the template 


// Templates
const messageTemplate = document.querySelector('#message-template').innerHTML // we're using this to access script in index.html and use HTML data within
const locationTemplate = document.querySelector('#location-template').innerHTML
const sideBarTemplate = document.querySelector('#sidebar-template').innerHTML
// Options
const { username, room } = Qs.parse(location.search, { ignoreQueryPrefix: true })

const autoscroll = () => {
    // New message element
    const $newMessage = $messages.lastElementChild

    // Height of the new message
    const newMessageStyles = getComputedStyle($newMessage)
    const newMessageMargin = parseInt(newMessageStyles.marginBottom)
    const newMessageHeight = $newMessage.offsetHeight + newMessageMargin

    // Visible height
    const visibleHeight = $messages.offsetHeight

    // Height of messages container
    const containerHeight = $messages.scrollHeight

    // How far have I scrolled
    const scrolloffset = $messages.scrollTop + visibleHeight

    if(containerHeight - newMessageHeight <= scrolloffset) {
        $messages.scrollTop = $messages.scrollHeight
    }

}

socket.on('message', (message) => {
    console.log(message)
    const html = Mustache.render(messageTemplate, {
        username: message.username,
        message: message.text,
        createdAt: moment(message.createdAt).format("HH:mm")
    })// we are rendering the mustache template
    $messages.insertAdjacentHTML('beforeend', html) // this allows us to insert other html document withn
    autoscroll()
})

socket.on('locationMessage', (location) => {
    console.log(location)
    const html = Mustache.render(locationTemplate, {
        username: location.username,
        url: location.url,
        createdAt: moment(location.createdAt).format("HH:mm")
    })
    $messages.insertAdjacentHTML('beforeend', html)
    autoscroll()
})

socket.on('roomData', ({ room, users }) => {
   const html = Mustache.render(sideBarTemplate, {
       room,
       users
   })
   document.querySelector('#sidebar').innerHTML = html
})

$messageForm.addEventListener('submit', (e) => {
    e.preventDefault()

    $messageFormButton.setAttribute('disabled', 'disabled')
    // disable

    const message = e.target.elements.message.value // e-event;target - we get the form;elements - providing access to form's elements(input,button);from here we tackling elements by their names (in this case it's 'message) and then .value

    socket.emit('sendMessage', message, (error) => {//sending event to the server
        $messageFormButton.removeAttribute('disabled')
        $messageFormInput.value = '' // clearing the input line
        $messageFormInput.focus() // we focus cursor to the input line
        //enable

        if(error) {
            return console.log(error)
        }
        console.log('Message delivered')
    }) 
})

$sendLocationButton.addEventListener('click', () => {
    if(!navigator.geolocation) {
        return alert('Geolocation is not supported by your browser')
    }

    $sendLocationButton.setAttribute('disabled', 'disabled')
    //disable
    navigator.geolocation.getCurrentPosition((position) => {
       socket.emit('sendLocation', {
           longitude: position.coords.longitude,
           latitude: position.coords.latitude
       },(callback) => {
        $sendLocationButton.removeAttribute('disabled')
        //enable
        console.log('Location shared')
       })
    })
})

socket.emit('join', { username, room }, (error) => {
    if(error) {
        alert(error)
        location.href = '/'
    }
})


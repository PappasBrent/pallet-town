import aws from 'aws-sdk'
// check development status
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config()
}

function initializeAWS() {
    aws.config.region = 'us-east-1';
}

export default initializeAWS
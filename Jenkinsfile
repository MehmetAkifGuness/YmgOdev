pipeline {
    agent any

    tools {
        maven 'Maven3'
    }

    environment {
        DOCKER_COMPOSE_FILE = 'compose.yaml'
    }

    stages {
        stage('🚀 Kodları Getir') {
            steps {
                git branch: 'main',
                    url: 'https://github.com/MehmetAkifGuness/YmgOdev.git',
                    credentialsId: 'github-credentials' // GitHub credentials ID'sini Jenkins'te tanımlayın
            }
        }

        stage('📦 Derleme (Maven Build)') {
            steps {
                bat 'mvn clean package -DskipTests'
            }
            post {
                success {
                    echo '✅ Maven build başarılı!'
                    archiveArtifacts artifacts: 'target/*.jar', fingerprint: true
                }
                failure {
                    echo '❌ Maven build başarısız!'
                }
            }
        }

        stage('🧪 Testleri Çalıştır') {
            steps {
                bat 'mvn test'
            }
            post {
                always {
                    junit 'target/surefire-reports/*.xml'
                }
            }
        }

        stage('🚚 Yayına Al (Docker Compose)') {
            steps {
                script {
                    // Eski container'ları durdur ve sil
                    bat 'docker compose down --volumes --remove-orphans || ver > nul'

                    // Yeni build ile ayağa kaldır
                    bat 'docker compose up -d --build'
                }
            }
        }

        stage('🔍 Sağlık Kontrolü') {
            steps {
                script {
                    // Uygulamanın hazır olmasını bekle
                    bat 'timeout /t 30 /nobreak > nul'
                    // Health check ekleyebilirsiniz
                    echo '✅ Deployment tamamlandı!'
                }
            }
        }
    }

    post {
        always {
            echo 'Pipeline tamamlandı!'
        }
        success {
            echo '🎉 Pipeline başarılı!'
        }
        failure {
            echo '💥 Pipeline başarısız!'
            // Bildirim gönderebilirsiniz
        }
    }
}
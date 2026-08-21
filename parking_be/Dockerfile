FROM maven:3.9.11-eclipse-temurin-21 AS build

WORKDIR /app

COPY pom.xml .
RUN mvn -B dependency:go-offline

COPY src ./src
RUN mvn -B clean package -DskipTests

FROM eclipse-temurin:21-jre

WORKDIR /app

COPY --from=build /app/target/parking-be-0.0.1-SNAPSHOT.jar app.jar

ENV PORT=8080
EXPOSE 8080

CMD ["sh", "-c", "java -Dserver.port=${PORT:-8080} -jar /app/app.jar"]

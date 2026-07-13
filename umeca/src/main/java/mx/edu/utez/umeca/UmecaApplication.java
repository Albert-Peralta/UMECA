package mx.edu.utez.umeca;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class UmecaApplication {

	public static void main(String[] args) {
		SpringApplication.run(UmecaApplication.class, args);
	}

}


package in.baliraja.controller;

import in.baliraja.model.Product;
import org.springframework.web.bind.annotation.*;
import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api/products")
@CrossOrigin(origins = "*")
public class ProductController {

    @GetMapping
    public List<Product> getAllProducts() {
        // Mock data for example
        List<Product> products = new ArrayList<>();
        products.add(new Product(1L, "ताजे टोमॅटो", "Vegetables", 40.0, "किलो", "सखाराम पाटील", "नाशिक", "", "नाशिकचे लाल टोमॅटो"));
        return products;
    }

    @PostMapping
    public Product addProduct(@RequestBody Product product) {
        // Logic to save product to database
        return product;
    }
}

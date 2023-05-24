# run optimiser on onxx file

import onnx
import onnxoptimizer

onnxfile = "silero_vad.onnx"

onnx_model = onnx.load(onnxfile)
passes = ["extract_constant_to_initializer", "eliminate_unused_initializer"]
optimized_model = onnxoptimizer.optimize(onnx_model, passes)

onnx.save(optimized_model, onnxfile)

print("Optimised model saved to: ", onnxfile)


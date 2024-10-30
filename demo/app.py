import os
from typing import List

import gradio as gr
from gradio_image_annotation import image_annotator

## GLOBALS VARIABLES ##
current_loaded_images = {}
calibration_options = {}

JS_LIGHT_THEME = """
function refresh() {
    const url = new URL(window.location);

    if (url.searchParams.get('__theme') !== 'light') {
        url.searchParams.set('__theme', 'light');
        window.location.href = url.href;
    }
}
"""

CSS = """
#gradio-upload-button {
    height: 2.5rem !important;
    border-radius: 0.5rem !important;
    margin-top: 1rem !important;
}

#show-hide-settings > label {  
    font-size: 1.1 rem !important;
}
"""


example_annotation = {
    "image": "https://gradio-builds.s3.amazonaws.com/demo-files/base.png",
    "boxes": [
        {
            "xmin": 636,
            "ymin": 575,
            "xmax": 801,
            "ymax": 697,
            "label": "Vehicle",
            "color": (255, 0, 0),
        },
        {
            "xmin": 360,
            "ymin": 615,
            "xmax": 386,
            "ymax": 702,
            "label": "Person",
            "color": (0, 255, 0),
        },
    ],
}


def crop(annotations):
    if annotations["boxes"]:
        box = annotations["boxes"][0]
        return annotations["image"][
            box["ymin"] : box["ymax"], box["xmin"] : box["xmax"]
        ]
    return None


def get_boxes_json(annotations):
    return annotations["boxes"]


def _show_hide_setting(setting_state):
    status = not setting_state
    btn_label = "Show Setting" if setting_state else "Hide Setting"

    return gr.update(visible=status), btn_label, status


def _folder_selection(list_files: List[str] | None):
    global current_loaded_images

    if list_files is None:
        return []

    # Empty the current loaded images
    current_loaded_images = {}

    for file_path in list_files:
        if file_path.endswith(".png") or file_path.endswith(".jpg"):
            base_name = os.path.basename(file_path)
            current_loaded_images[base_name] = file_path

    file_names = list(current_loaded_images.keys())

    return gr.update(choices=file_names, value=file_names[0])


with gr.Blocks(
    js=JS_LIGHT_THEME,
    theme=gr.themes.Soft(primary_hue="slate"),
    css=CSS,
) as demo:
    gr.Markdown("# Image Annotation")
    gr.Markdown("---")

    with gr.Row(equal_height=True) as row:
        setting_state = gr.State(value=True)
        with gr.Column(scale=30, variant="panel", visible=setting_state) as setting_col:
            gr.Markdown("#### Step 1: Upload an image")
            dropdown = gr.Dropdown(
                label="Choose an image",
                allow_custom_value=True,
                interactive=True,
            )

            folder_of_images_btn = gr.UploadButton(
                elem_id="gradio-upload-button",
                variant="primary",
                label="Choose a folder",
                file_count="directory",
            )

            gr.Markdown("---")
            gr.Markdown("#### Output JSON")

            json_boxes = gr.JSON()

        with gr.Column(scale=70, variant="panel") as annotatate_col:
            gr.Markdown("#### Step 2: Annotate the image")

            annotator = image_annotator(
                example_annotation,
                label_list=["Person", "Vehicle"],
                label_colors=[(0, 255, 0), (255, 0, 0)],
            )

            with gr.Row(variant="panel"):
                prev_button = gr.Button(
                    value="< Prev",
                    variant="primary",
                )
                with gr.Column(scale=80):
                    pass

                next_button = gr.Button(
                    value="Next >",
                    variant="primary",
                )

            with gr.Row(variant="panel"):
                show_hide_setting_btn = gr.Button(
                    value="Show Setting" if not setting_state else "Hide Setting",
                    variant="stop",
                )

                get_coor_btn = gr.Button(
                    "Get bounding boxes",
                    variant="primary",
                )

            # Register event handler for folder selection

            folder_of_images_btn.upload(
                _folder_selection,
                inputs=[folder_of_images_btn],
                outputs=[dropdown],
            )

            get_coor_btn.click(
                get_boxes_json,
                annotator,
                json_boxes,
            )

            show_hide_setting_btn.click(
                fn=_show_hide_setting,
                inputs=[setting_state],
                outputs=[setting_col, show_hide_setting_btn, setting_state],
            )


if __name__ == "__main__":
    demo.launch()
